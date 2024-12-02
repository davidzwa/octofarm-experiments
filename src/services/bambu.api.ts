import { FileDto, IPrinterApi, PartialReprintFileDto, PrinterType } from "@/services/printer-api.interface";
import { LoggerService } from "@/handlers/logger";
import { LoginDto } from "@/services/interfaces/login.dto";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { BambuClient } from "@/services/bambu/bambu.client";
import { AxiosPromise } from "axios";
import { ServerConfigDto } from "./moonraker/dto/server/server-config.dto";
import { SettingsDto } from "./octoprint/dto/settings/settings.dto";

export class BambuApi implements IPrinterApi {
  logger: LoggerService;
  client: BambuClient;
  printerLogin: LoginDto;

  constructor({
    bambuClient,
    printerLogin,
    loggerFactory,
  }: {
    bambuClient: BambuClient;
    printerLogin: LoginDto;
    loggerFactory: ILoggerFactory;
  }) {
    this.logger = loggerFactory(BambuApi.name);
    this.client = bambuClient;
    this.printerLogin = printerLogin;
  }

  get type(): PrinterType {
    throw new Error("Method not implemented.");
  }
  set login(login: LoginDto) {
    throw new Error("Method not implemented.");
  }
  getVersion(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  connect(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  disconnect(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  restartServer(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  restartHost(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  restartPrinterFirmware(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  startPrint(path: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  pausePrint(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  resumePrint(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cancelPrint(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  quickStop(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  sendGcode(script: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  movePrintHead(amounts: { x?: number; y?: number; z?: number; speed?: number }): Promise<void> {
    throw new Error("Method not implemented.");
  }
  homeAxes(axes: { x?: boolean; y?: boolean; z?: boolean }): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getFile(path: string): Promise<FileDto> {
    throw new Error("Method not implemented.");
  }
  getFiles(): Promise<FileDto[]> {
    throw new Error("Method not implemented.");
  }
  downloadFile(path: string): AxiosPromise<NodeJS.ReadableStream> {
    throw new Error("Method not implemented.");
  }
  getFileChunk(path: string, startBytes: number, endBytes: number): AxiosPromise<string> {
    throw new Error("Method not implemented.");
  }
  uploadFile(fileOrBuffer: Buffer | Express.Multer.File, uploadToken?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  deleteFile(path: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  deleteFolder(path: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getSettings(): Promise<ServerConfigDto | SettingsDto> {
    throw new Error("Method not implemented.");
  }
  getReprintState(): Promise<PartialReprintFileDto> {
    throw new Error("Method not implemented.");
  }
}
