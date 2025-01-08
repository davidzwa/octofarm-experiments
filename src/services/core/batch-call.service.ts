import { PrinterFilesStore } from "@/state/printer-files.store";
import { PrinterAdapterStore } from "@/state/printer-adapter.store";
import { PrinterCache } from "@/state/printer.cache";
import { PrinterEventsCache } from "@/state/printer-events.cache";
import { IPrinterService } from "@/services/interfaces/printer.service.interface";
import { IdType } from "@/shared.constants";
import { captureException } from "@sentry/node";
import { errorSummary } from "@/utils/error.utils";
import { LoggerService } from "@/handlers/logger";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { PrinterApiFactory } from "@/services/printer-api.factory";
import { IPrinterApi, ReprintFileDto, ReprintState } from "@/services/printer-api.interface";
import { LoginDto } from "@/services/interfaces/login.dto";

interface BatchSingletonModel {
  success?: boolean;
  failure?: boolean;
  printerId: IdType;
  time: number;
  error?: string;
}

type BatchModel = Array<BatchSingletonModel>;

export class BatchCallService {
  printerApiFactory: PrinterApiFactory;
  printerAdapterStore: PrinterAdapterStore;
  printerCache: PrinterCache;
  printerEventsCache: PrinterEventsCache;
  printerFilesStore: PrinterFilesStore;
  printerService: IPrinterService;
  logger: LoggerService;

  constructor({
    printerApiFactory,
    printerCache,
    printerEventsCache,
    printerAdapterStore,
    printerFilesStore,
    printerService,
    loggerFactory,
  }: {
    printerApiFactory: PrinterApiFactory;
    printerCache: PrinterCache;
    printerEventsCache: PrinterEventsCache;
    printerAdapterStore: PrinterAdapterStore;
    printerFilesStore: PrinterFilesStore;
    printerService: IPrinterService;
    loggerFactory: ILoggerFactory;
  }) {
    this.printerApiFactory = printerApiFactory;
    this.printerCache = printerCache;
    this.printerEventsCache = printerEventsCache;
    this.printerAdapterStore = printerAdapterStore;
    this.printerFilesStore = printerFilesStore;
    this.printerService = printerService;
    this.logger = loggerFactory(BatchCallService.name);
  }

  getPrinter(login: LoginDto): IPrinterApi {
    return this.printerApiFactory.getScopedPrinter(login);
  }

  async batchTogglePrintersEnabled(
    printerIds: string[],
    enabled: boolean
  ): Promise<
    {
      failure?: boolean;
      error?: any;
      success?: boolean;
      printerId: string;
      time: number;
    }[]
  > {
    const promises = [];
    for (const printerId of printerIds) {
      let promise: Promise<any>;
      const printerDto = await this.printerCache.getValue(printerId);
      if (!printerDto) continue;

      const time = Date.now();
      if (enabled) {
        // If disabled, but not in maintenance, enable the printer
        if (!printerDto.enabled && !printerDto.disabledReason?.length) {
          promise = this.printerService
            .updateEnabled(printerId, true)
            .then(() => {
              return { success: true, printerId, time: Date.now() - time };
            })
            .catch((e) => {
              return { failure: true, error: e.message, printerId, time: Date.now() - time };
            });
        }
      } else {
        // If enabled, disable the printer
        if (printerDto.enabled) {
          promise = this.printerService
            .updateEnabled(printerId, false)
            .then(() => {
              return { success: true, printerId, time: Date.now() - time };
            })
            .catch((e) => {
              return { failure: true, error: e.message, printerId, time: Date.now() - time };
            });
        }
      }
      promises.push(promise);
    }

    return await Promise.all(promises);
  }

  async batchConnectSocket(printerIds: string[]): Promise<void> {
    for (const printerId of printerIds) {
      try {
        await this.printerAdapterStore.reconnectAdapter(printerId);
      } catch (e) {
        captureException(e);
        this.logger.error(`Error setting socket to reconnect ${errorSummary(e)}`);
      }
    }
  }

  async batchSettingsGet(printerIds: string[]): Promise<Awaited<BatchModel>> {
    const promises = [];
    for (const printerId of printerIds) {
      const login = await this.printerCache.getLoginDtoAsync(printerId);
      const time = Date.now();

      const client = this.getPrinter(login);

      const promise = client
        .getSettings()
        .then((r) => {
          return { success: true, printerId, time: Date.now() - time, value: r };
        })
        .catch((e) => {
          return { failure: true, error: e.message, printerId, time: Date.now() - time };
        });

      promises.push(promise);
    }
    return await Promise.all(promises);
  }

  async batchConnectUsb(printerIds: string[]): Promise<Awaited<BatchModel>> {
    const promises = [];
    for (const printerId of printerIds) {
      const login = await this.printerCache.getLoginDtoAsync(printerId);
      const time = Date.now();

      const client = this.getPrinter(login);
      const promise = client
        .connect()
        .then(() => {
          return { success: true, printerId, time: Date.now() - time };
        })
        .catch((e) => {
          return { failure: true, error: e.message, printerId, time: Date.now() - time };
        });

      promises.push(promise);
    }
    return await Promise.all(promises);
  }

  async getBatchPrinterReprintFile(printerIds: IdType[]): Promise<ReprintFileDto[]> {
    const promises = [];
    for (const printerId of printerIds) {
      const promise = new Promise<ReprintFileDto>(async (resolve, _) => {
        try {
          const login = await this.printerCache.getLoginDtoAsync(printerId);
          const client = this.getPrinter(login);
          const partialReprintState = await client.getReprintState();

          return resolve({
            ...partialReprintState,
            printerId,
          });
        } catch (e) {
          captureException(e);
          return resolve({
            connectionState: null,
            printerId,
            reprintState: ReprintState.PrinterNotAvailable,
          });
        }
      });
      promises.push(promise);
    }

    return await Promise.all(promises);
  }

  async batchReprintCalls(printerIdFileList: { printerId: IdType; path: string }[]): Promise<Awaited<BatchModel>> {
    const promises = [];
    for (const printerIdFile of printerIdFileList) {
      const { printerId, path } = printerIdFile;
      const login = await this.printerCache.getLoginDtoAsync(printerId);

      const time = Date.now();
      const client = this.getPrinter(login);
      const promise = client
        .startPrint(path)
        .then(() => {
          return { success: true, printerId, time: Date.now() - time };
        })
        .catch((e) => {
          captureException(e);
          return { failure: true, error: e.message, printerId, time: Date.now() - time };
        });

      promises.push(promise);
    }
    return await Promise.all(promises);
  }
}
