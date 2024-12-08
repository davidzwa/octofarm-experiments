import { fdmMonsterPrinterStoppedEvent, octoPrintWebsocketEvent } from "@/constants/event.constants";
import { EVENT_TYPES } from "@/services/octoprint/constants/octoprint-websocket.constants";
import { generateCorrelationToken } from "@/utils/correlation-token.util";
import { SocketIoGateway } from "@/state/socket-io.gateway";
import EventEmitter2 from "eventemitter2";
import { LoggerService } from "@/handlers/logger";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { CreatePrintHistoryDto, PrintCompletionContext } from "@/services/interfaces/print-history.dto";
import { IdType } from "@/shared.constants";
import { OctoPrintEventDto } from "@/services/octoprint/dto/octoprint-event.dto";
import { PrinterEventsCache } from "@/state/printer-events.cache";
import { IPrintHistoryService } from "@/services/interfaces/print-history.interface";

export class PrintCompletionSocketIoTask {
  eventEmitter2: EventEmitter2;
  socketIoGateway: SocketIoGateway;
  logger: LoggerService;
  printerEventsCache: PrinterEventsCache;
  printCompletionService: IPrintHistoryService;

  contextCache: Record<IdType, PrintCompletionContext> = {};

  constructor({
    eventEmitter2,
    socketIoGateway,
    printCompletionService,
    printerEventsCache,
    loggerFactory,
  }: {
    eventEmitter2: EventEmitter2;
    socketIoGateway: SocketIoGateway;
    printCompletionService: IPrintHistoryService;
    printerEventsCache: PrinterEventsCache;
    loggerFactory: ILoggerFactory;
  }) {
    this.eventEmitter2 = eventEmitter2;
    this.socketIoGateway = socketIoGateway;
    this.printerEventsCache = printerEventsCache;
    this.printCompletionService = printCompletionService;
    this.logger = loggerFactory(PrintCompletionSocketIoTask.name);

    let that = this;
    this.eventEmitter2.on(octoPrintWebsocketEvent("*"), async function (octoPrintEvent, data) {
      await that.handleMessage(this.event, octoPrintEvent, data);
    });
  }

  get contexts() {
    return this.contextCache;
  }

  async handleMessage(fdmEvent: string, data: OctoPrintEventDto) {
    // If not parsed well, skip log
    const printerId = data.printerId;
    if (!printerId) {
      this.logger.log(`Skipping print completion log for FDM event ${fdmEvent}`);
    }

    if (data.event !== "event") {
      return;
    }

    // TODO there is no need for this now
    // this.socketIoGateway.send(IO_MESSAGES.CompletionEvent, JSON.stringify({ fdmEvent, octoPrintEvent, data }));

    const completion = {
      status: data.payload.type,
      fileName: data.payload?.payload?.name,
      createdAt: Date.now(),
      completionLog: data.payload?.error,
      printerId,
      context: {
        correlationId: null,
      },
    } as CreatePrintHistoryDto;
    if (
      data.payload.type === EVENT_TYPES.EStop ||
      data.payload.type === EVENT_TYPES.PrintCancelling ||
      data.payload.type === EVENT_TYPES.PrintCancelled ||
      data.payload.type === EVENT_TYPES.Home ||
      data.payload.type === EVENT_TYPES.TransferStarted ||
      data.payload.type === EVENT_TYPES.TransferDone ||
      data.payload.type === EVENT_TYPES.Disconnecting ||
      data.payload.type === EVENT_TYPES.Disconnected ||
      data.payload.type === EVENT_TYPES.MetadataAnalysisStarted ||
      data.payload.type === EVENT_TYPES.MetadataAnalysisFinished ||
      data.payload.type === EVENT_TYPES.Error
    ) {
      this.contextCache[printerId] = {
        ...this.contextCache[printerId],
        [data.payload.type]: completion,
      };

      if (data.payload.type === EVENT_TYPES.Disconnecting || data.payload.type === EVENT_TYPES.Disconnected) {
        await this.printerEventsCache.setSubstate(printerId, "current", "state", {
          text: data.payload.type,
          flags: {
            operational: false,
            printing: false,
            ready: false,
            closedOrError: true,
            error: false,
          },
        });
      }

      const corrId = this.contextCache[printerId].correlationId;
      await this.printCompletionService.updateContext(corrId, this.contextCache[printerId]);
      return;
    }

    if (data.payload.type === EVENT_TYPES.PrintStarted) {
      // Clear the context now with association id
      const token = generateCorrelationToken();
      this.contextCache[printerId] = {
        correlationId: token,
      };
      completion.context = this.contextCache[printerId];
      await this.printCompletionService.create(completion);
    } else if (data.payload.type === EVENT_TYPES.PrintFailed || data.payload.type === EVENT_TYPES.PrintDone) {
      // TODO fix runtime memory dependency
      completion.context = this.contextCache[printerId];
      await this.printCompletionService.create(completion);

      this.eventEmitter2.emit(fdmMonsterPrinterStoppedEvent(printerId));

      // Clear the context now
      this.contextCache[printerId] = {};
    }
  }

  async run() {
    // Run once to bind event handler and reload the cache
    this.contextCache = await this.printCompletionService.loadPrintContexts();
  }
}
