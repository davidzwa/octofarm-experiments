import { AxiosPromise } from "axios";
import { LoginDto } from "@/services/interfaces/login.dto";
import { ServerConfigDto } from "@/services/moonraker/dto/server/server-config.dto";
import { SettingsDto } from "@/services/octoprint/dto/settings/settings.dto";
import { ConnectionState } from "@/services/octoprint/dto/connection/connection-state.type";
import { IdType } from "@/shared.constants";
import { BambuApi } from "@/services/bambu.api";

export const OctoprintType = 0 as const;
export const MoonrakerType = 1 as const;
export const BambuType = 2 as const;
export type PrinterType = typeof OctoprintType | typeof MoonrakerType | typeof BambuType;

export interface StatusFlags {
  connected: boolean;
  operational: boolean;
  printing: boolean;
  paused: boolean;
  error: boolean;
  finished: boolean;
}

export interface FileDto {
  path: string;
  size: number;
  date: number;
  // hash?: number | string;
}

export const capabilities = {
  // Could be function names, or maybe a specification for each function specifically?
  startPrint: "startPrint",
};

export type Capability = keyof typeof capabilities;

export enum ReprintState {
  PrinterNotAvailable = 0,
  NoLastPrint = 1,
  LastPrintReady = 2,
}

export interface PartialReprintFileDto {
  file?: FileDto;
  reprintState: ReprintState;
  connectionState: ConnectionState | null;
}

export interface ReprintFileDto extends PartialReprintFileDto {
  printerId: IdType;
}

export interface IPrinterApi {
  get type(): PrinterType;
  set login(login: LoginDto);
  getVersion(): Promise<string>;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  restartServer(): Promise<void>;
  restartHost(): Promise<void>;
  restartPrinterFirmware(): Promise<void>;

  startPrint(path: string): Promise<void>;
  pausePrint(): Promise<void>;
  resumePrint(): Promise<void>;
  cancelPrint(): Promise<void>;
  quickStop(): Promise<void>;

  // Subsetting of OctoPrint
  // getName(): string;
  // isCapable(capability: Capability): boolean;
  // getStatus(): string;
  // getStatusFlags(): StatusFlags;

  sendGcode(script: string): Promise<void>;
  movePrintHead(amounts: { x?: number; y?: number; z?: number; speed?: number }): Promise<void>;
  homeAxes(axes: { x?: boolean; y?: boolean; z?: boolean }): Promise<void>;

  getFile(path: string): Promise<FileDto>;
  getFiles(): Promise<FileDto[]>;
  downloadFile(path: string): AxiosPromise<NodeJS.ReadableStream>;
  getFileChunk(path: string, startBytes: number, endBytes: number): AxiosPromise<string>;
  uploadFile(fileOrBuffer: Buffer | Express.Multer.File, uploadToken?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  deleteFolder(path: string): Promise<void>;

  getSettings(): Promise<ServerConfigDto | SettingsDto>;

  getReprintState(): Promise<PartialReprintFileDto>;
}
