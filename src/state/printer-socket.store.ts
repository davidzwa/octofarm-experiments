import { captureException } from "@sentry/node";
import { errorSummary } from "@/utils/error.utils";
import { printerEvents } from "@/constants/event.constants";
import EventEmitter2 from "eventemitter2";
import { SocketFactory } from "@/services/socket.factory";
import { PrinterCache } from "@/state/printer.cache";
import { OctoprintWebsocketAdapter } from "@/services/octoprint/octoprint-websocket.adapter";
import { LoggerService } from "@/handlers/logger";
import { ConfigService } from "@/services/core/config.service";
import { SettingsStore } from "@/state/settings.store";
import { SocketIoGateway } from "@/state/socket-io.gateway";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { IdType } from "@/shared.constants";
import { PrinterUnsafeDto } from "@/services/interfaces/printer.dto";
import { OctoprintType } from "@/services/printer-api.interface";
import { IWebsocketAdapter } from "@/services/websocket-adapter.interface";

export class PrinterSocketStore {
  socketIoGateway: SocketIoGateway;
  socketFactory: SocketFactory;
  eventEmitter2: EventEmitter2;
  printerCache: PrinterCache;
  printerSocketAdaptersById: Record<string, IWebsocketAdapter> = {};
  logger: LoggerService;
  configService: ConfigService;
  settingsStore: SettingsStore;

  constructor({
    socketFactory,
    socketIoGateway,
    settingsStore,
    eventEmitter2,
    printerCache,
    loggerFactory,
    configService,
  }: {
    socketFactory: SocketFactory;
    socketIoGateway: SocketIoGateway;
    settingsStore: SettingsStore;
    eventEmitter2: EventEmitter2;
    printerCache: PrinterCache;
    loggerFactory: ILoggerFactory;
    configService: ConfigService;
  }) {
    this.printerCache = printerCache;
    this.socketIoGateway = socketIoGateway;
    this.socketFactory = socketFactory;
    this.eventEmitter2 = eventEmitter2;
    this.settingsStore = settingsStore;
    this.logger = loggerFactory(PrinterSocketStore.name);
    this.configService = configService;

    this.subscribeToEvents();
  }

  getSocketStatesById() {
    const socketStatesById = {};
    Object.values(this.printerSocketAdaptersById).forEach((s) => {
      socketStatesById[s.printerId] = {
        printerId: s.printerId,
        printerType: s.printerType,
        socket: s.socketState,
        api: s.apiState,
      };
    });
    return socketStatesById;
  }

  /**
   * Load all printers into cache, and create a new socket for each printer (if enabled)
   * @param {OctoPrintEventDto} e
   */
  async loadPrinterSockets() {
    await this.printerCache.loadCache();

    const printerDocs = await this.printerCache.listCachedPrinters(false);
    this.printerSocketAdaptersById = {};
    /**
     * @type {Printer}
     */
    for (const doc of printerDocs) {
      try {
        await this.handlePrinterCreated({ printer: doc });
      } catch (e) {
        captureException(e);
        this.logger.error("PrinterSocketStore failed to construct new printer socket.", errorSummary(e));
      }
    }

    this.logger.log(`Loaded ${Object.keys(this.printerSocketAdaptersById).length} printer sockets`);
  }

  listPrinterSockets() {
    return Object.values(this.printerSocketAdaptersById);
  }

  /**
   * Reconnect the OctoPrint Websocket connection
   */
  reconnectOctoPrint(id: IdType) {
    const socket = this.getPrinterSocket(id);
    if (!socket) return;

    socket.close();

    // The reconnect task will pick up this state and reconnect
    socket.resetSocketState();
  }

  getPrinterSocket(id: IdType): OctoprintWebsocketAdapter | undefined {
    return this.printerSocketAdaptersById[id];
  }

  /**
   * Sets up the new WebSocket connections for all printers
   */
  async reconnectPrinterSockets(): Promise<void> {
    let reauthRequested = 0;
    let socketSetupRequested = 0;
    const socketStates = {};
    const apiStates = {};
    const promisesReauth = [];
    const failedSocketsReauth = [];
    for (const socket of Object.values(this.printerSocketAdaptersById)) {
      try {
        if (socket.printerType === OctoprintType && (socket as OctoprintWebsocketAdapter).needsReauth()) {
          reauthRequested++;
          // TODO OP close socket
          const promise = socket.reauthSession().catch((_) => {
            failedSocketsReauth.push(socket.printerId);
          });
          // TODO MR reconnect
          promisesReauth.push(promise);
        }
      } catch (e) {
        if (this.settingsStore.getDebugSettingsSensitive()?.debugSocketSetup) {
          this.logger.log("Failed to reauth printer socket", errorSummary(e));
        }
        captureException(e);
      }
    }

    await Promise.all(promisesReauth);

    const promisesOpenSocket: any[] = [];
    const failedSocketReopened: any[] = [];
    for (const socket of Object.values(this.printerSocketAdaptersById)) {
      try {
        if (socket.needsSetup() || socket.needsReopen()) {
          if (this.settingsStore.getDebugSettingsSensitive()?.debugSocketSetup) {
            // Exception anonymity
            this.logger.log(
              `Reopening socket for printerId '${
                socket.printerId
              }' (setup: ${socket.needsSetup()}, reopen: ${socket.needsReopen()})`
            );
          }
          socketSetupRequested++;
          const promise = socket
            .setupSocketSession()
            .then(() => {
              socket.open();
            })
            .catch((_) => {
              failedSocketReopened.push(socket.printerId);
            });
          promisesOpenSocket.push(promise);
        }
      } catch (e) {
        if (this.settingsStore.getDebugSettingsSensitive()?.debugSocketSetup) {
          this.logger.log(`Failed to setup printer socket ${errorSummary(e)}`);
        }
        captureException(e);
      }

      const keySocket = socket.socketState;
      const valSocket = socketStates[keySocket];
      socketStates[keySocket] = valSocket ? valSocket + 1 : 1;
      const keyApi = socket.apiState;
      const valApi = apiStates[keyApi];
      apiStates[keyApi] = valApi ? valApi + 1 : 1;
    }

    await Promise.all(promisesOpenSocket);

    return {
      reauth: reauthRequested,
      failedSocketReopened,
      failedSocketsReauth,
      socketSetup: socketSetupRequested,
      socket: socketStates,
      api: apiStates,
    };
  }

  createOrUpdateSocket(printer: PrinterUnsafeDto<IdType>) {
    const { enabled, id } = printer;
    let foundAdapter = this.printerSocketAdaptersById[id.toString()];

    // Delete the socket if the printer is disabled
    if (!enabled) {
      this.logger.log(`Printer is disabled. Deleting socket`);
      this.deleteSocket(id);
      return;
    }

    // Create a new socket if it doesn't exist
    if (!foundAdapter) {
      foundAdapter = this.socketFactory.createInstance(printer.printerType);
      this.printerSocketAdaptersById[id] = foundAdapter;
    } else {
      foundAdapter.close();
      this.logger.log(`Closing printer socket for update`);
    }

    // Reset the socket credentials before (re-)connecting
    foundAdapter.registerCredentials({
      printerId: printer.id.toString(),
      loginDto: {
        apiKey: printer.apiKey,
        printerURL: printer.printerURL,
        printerType: printer.printerType,
      },
    });
    foundAdapter.resetSocketState();
  }

  private handleBatchPrinterCreated({ printers }) {
    for (const p of printers) {
      this.handlePrinterCreated({ printer: p });
    }
  }

  /**
   * @param { printer: Printer } printer
   * @returns void
   */
  private handlePrinterCreated({ printer }) {
    this.createOrUpdateSocket(printer);
  }

  /**
   * @param { printer: Printer } printer
   * @returns void
   */
  private handlePrinterUpdated({ printer }) {
    this.logger.log(`Printer updated. Updating socket`);
    this.createOrUpdateSocket(printer);
  }

  private handlePrintersDeleted({ printerIds }) {
    printerIds.forEach((id) => {
      this.deleteSocket(id);
    });
  }

  private subscribeToEvents() {
    this.eventEmitter2.on(printerEvents.printerCreated, this.handlePrinterCreated.bind(this));
    this.eventEmitter2.on(printerEvents.printersDeleted, this.handlePrintersDeleted.bind(this));
    this.eventEmitter2.on(printerEvents.printerUpdated, this.handlePrinterUpdated.bind(this));
    this.eventEmitter2.on(printerEvents.batchPrinterCreated, this.handleBatchPrinterCreated.bind(this));
  }

  private deleteSocket(printerId: string) {
    const socket = this.printerSocketAdaptersById[printerId];

    // Ensure that the printer does not re-register itself after being purged
    socket?.disallowEmittingEvents();

    socket?.close();

    // TODO mark diff cache
    delete this.printerSocketAdaptersById[printerId];
  }
}
