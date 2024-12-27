import { errorSummary } from "@/utils/error.utils";
import { SettingsStore } from "@/state/settings.store";
import { PrinterSocketStore } from "@/state/printer-socket.store";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";
import { LoggerService } from "@/handlers/logger";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { captureException } from "@sentry/node";
import { API_STATE } from "@/shared/dtos/api-state.type";
import { OctoprintType } from "@/services/printer-api.interface";

export class PrinterWebsocketRestoreTask {
  settingsStore: SettingsStore;
  printerSocketStore: PrinterSocketStore;
  octoprintClient: OctoprintClient;
  logger: LoggerService;

  constructor({
    printerSocketStore,
    octoprintClient,
    settingsStore,
    loggerFactory,
  }: {
    printerSocketStore: PrinterSocketStore;
    octoprintClient: OctoprintClient;
    settingsStore: SettingsStore;
    loggerFactory: ILoggerFactory;
  }) {
    this.printerSocketStore = printerSocketStore;
    this.octoprintClient = octoprintClient;
    this.settingsStore = settingsStore;
    this.logger = loggerFactory(PrinterWebsocketRestoreTask.name);
  }

  async run() {
    const startTime = Date.now();

    const existingSockets = this.printerSocketStore.listPrinterSockets();
    const resetAdapterIds = [];
    const silentSocketIds = [];
    for (const socket of existingSockets) {
      if (socket.printerType !== OctoprintType) {
        continue;
      }

      try {
        if (socket.isClosedOrAborted()) {
          socket.close();
          socket.resetSocketState();
          this.logger.warn("Socket was closed or aborted, manually removing it");
          resetAdapterIds.push(socket.printerId);
          continue;
        }
      } catch (e: any) {
        captureException(e);
        this.logger.error(`Resetting WebSocket socket failed for printer with error '${errorSummary(e)}'`, e.stack);
        continue;
      }

      // Often due to USB disconnect, not interesting to reconnect unless we perform an API call for verification
      if (
        (socket.apiState !== API_STATE.unset && !socket.lastMessageReceivedTimestamp) ||
        Date.now() - socket.lastMessageReceivedTimestamp > 10 * 1000
      ) {
        const result = await this.octoprintClient.getConnection(socket.login);

        silentSocketIds.push(socket.printerId);
        // Produce logs for silent sockets
        try {
          if (result?.current?.state !== "Closed") {
            this.logger.warn(
              `Silence was detected, but the OctoPrint current connection was not closed. Connection state ${result?.current?.state}`
            );
          }
        } catch (e) {
          this.logger.error(`Silence was detected, but Websocket was not closed/aborted and API could not be called`);
        }
      }
    }

    const duration = Date.now() - startTime;

    this.logger.log(
      `Reset ${resetAdapterIds.length} closed/aborted sockets and detected ${silentSocketIds.length} silent sockets (duration ${duration}ms)`
    );
  }
}
