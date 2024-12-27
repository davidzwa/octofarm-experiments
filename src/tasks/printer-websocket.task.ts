import { PrinterSocketStore } from "@/state/printer-socket.store";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";
import { SettingsStore } from "@/state/settings.store";
import { TaskManagerService } from "@/services/core/task-manager.service";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { LoggerService } from "@/handlers/logger";

export class PrinterWebsocketTask {
  printerSocketStore: PrinterSocketStore;
  settingsStore: SettingsStore;
  octoprintClient: OctoprintClient;
  taskManagerService: TaskManagerService;

  logger: LoggerService;

  constructor({
    printerSocketStore,
    octoprintClient,
    settingsStore,
    taskManagerService,
    loggerFactory,
  }: {
    printerSocketStore: PrinterSocketStore;
    octoprintClient: OctoprintClient;
    settingsStore: SettingsStore;
    taskManagerService: TaskManagerService;
    loggerFactory: ILoggerFactory;
  }) {
    this.printerSocketStore = printerSocketStore;
    this.settingsStore = settingsStore;
    this.octoprintClient = octoprintClient;
    this.taskManagerService = taskManagerService;
    this.logger = loggerFactory(PrinterWebsocketTask.name);
  }

  async run() {
    const startTime = Date.now();
    const result = await this.printerSocketStore.reconnectPrinterSockets();

    this.logger.log(`Socket reconnect (${Date.now() - startTime}ms)`, result);
  }
}
