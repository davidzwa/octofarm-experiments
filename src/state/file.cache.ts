import { ValidationException } from "@/exceptions/runtime.exceptions";
import { LoggerService } from "@/handlers/logger";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { IdType } from "@/shared.constants";
import { PrinterFileDto } from "@/services/interfaces/printer-file.dto";
import { IPrinterFile } from "@/models/PrinterFile";

export class FileCache {
  private printerFileStorage: Record<IdType, (IPrinterFile | PrinterFileDto)[]> = {};
  private totalFileCount = 0;

  private logger: LoggerService;

  constructor({ loggerFactory }: { loggerFactory: ILoggerFactory }) {
    this.logger = loggerFactory(FileCache.name);
  }

  cachePrinterFiles(printerId: IdType, files: (IPrinterFile | PrinterFileDto)[]) {
    if (!printerId) {
      throw new Error("File Cache cant get a null/undefined printer id");
    }
    this.printerFileStorage[printerId] = files;
    this.updateCacheFileRefCount();
  }

  getPrinterFiles(printerId: IdType) {
    if (!printerId) {
      throw new Error("File Cache cant get a null/undefined printer id");
    }
    return this.printerFileStorage[printerId];
  }

  updateCacheFileRefCount() {
    let totalFiles = 0;
    for (const storage of Object.values(this.printerFileStorage)) {
      totalFiles += storage?.length || 0;
    }

    if (totalFiles !== this.totalFileCount) {
      this.totalFileCount = totalFiles;
      this.logger.log(`Cache updated. ${this.totalFileCount} file storage references cached.`);
    }

    return totalFiles;
  }

  purgePrinterId(printerId: IdType) {
    if (!printerId) {
      throw new ValidationException("Parameter printerId was not provided.");
    }

    const fileStorage = this.printerFileStorage[printerId];

    if (!fileStorage) {
      this.logger.warn("Did not remove printer File Storage as it was not found");
      return;
    }

    delete this.printerFileStorage[printerId];

    this.logger.log(`Purged printerId '${printerId}' file cache`);
  }

  purgeFile(printerId: IdType, filePath: string) {
    const files = this.getPrinterFiles(printerId);
    if (!files) return;

    const fileIndex = files.findIndex((f) => f.path === filePath);
    if (fileIndex === -1) {
      // We can always choose to throw - if we trust the cache consistency
      this.logger.warn(
        `A file removal was ordered but this file was not found in files cache for printer Id ${printerId}`,
        filePath
      );

      return this.logger.log("File was not found in cached printer fileList");
    }

    files.splice(fileIndex, 1);
    this.logger.log(`File ${filePath} was removed`);
  }
}
