import {
  FileDto,
  IPrinterApi,
  MoonrakerType,
  PartialReprintFileDto,
  PrinterType,
  ReprintState,
} from "@/services/printer-api.interface";
import { MoonrakerClient } from "@/services/moonraker/moonraker.client";
import { LoginDto } from "@/services/interfaces/login.dto";
import { NotImplementedException } from "@/exceptions/runtime.exceptions";
import { AxiosPromise } from "axios";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { LoggerService } from "@/handlers/logger";
import { PrinterObjectsQueryDto } from "@/services/moonraker/dto/objects/printer-objects-query.dto";
import { PrintStatsObject, WebhooksObject } from "@/services/moonraker/dto/objects/printer-object.types";

/**
 * Moonraker Remote API
 * https://moonraker.readthedocs.io/en/latest/web_api/#query-server-info
 */
export class MoonrakerApi implements IPrinterApi {
  logger: LoggerService;
  client: MoonrakerClient;
  printerLogin: LoginDto;

  constructor({
    moonrakerClient,
    printerLogin,
    loggerFactory,
  }: {
    moonrakerClient: MoonrakerClient;
    printerLogin: LoginDto;
    loggerFactory: ILoggerFactory;
  }) {
    this.logger = loggerFactory(MoonrakerApi.name);
    this.client = moonrakerClient;
    this.printerLogin = printerLogin;
  }

  get type(): PrinterType {
    return MoonrakerType;
  }

  /**
   * When no request scope is present, this setter is to be used before calling any function.
   * @param login
   */
  set login(login: LoginDto) {
    this.printerLogin = login;
  }

  get login() {
    return this.printerLogin;
  }

  async getVersion() {
    const result = await this.client.getApiVersion(this.login);
    return result.data?.server;
  }

  async connect() {
    // TODO Needs investigation
    throw new NotImplementedException();
  }

  async disconnect() {
    // TODO Needs investigation
    throw new NotImplementedException();
  }

  async restartServer() {
    await this.client.postRestartServer(this.login);
  }

  async restartHost() {
    await this.client.postHostRestart(this.login);
  }

  async restartPrinterFirmware() {
    await this.client.postFirmwareRestart(this.login);
  }

  async startPrint(filename: string) {
    await this.client.postPrintStart(this.login, filename);
  }

  async pausePrint(): Promise<void> {
    await this.client.postPrintPause(this.login);
  }

  async resumePrint(): Promise<void> {
    await this.client.postPrintResume(this.login);
  }

  async cancelPrint(): Promise<void> {
    await this.client.postPrintCancel(this.login);
  }

  async sendGcode(script: string): Promise<void> {
    await this.client.postGcodeScript(this.login, script);
  }

  async quickStop(): Promise<void> {
    await this.client.postQuickStop(this.login);
  }

  async movePrintHead(amounts: { x?: number; y?: number; z?: number; speed?: number }) {
    // Compare to https://github.com/OctoPrint/OctoPrint/blob/fed2dd7660c1587e2c280a30ed9d84ceffa1b89d/src/octoprint/printer/standard.py#L511
    // And https://github.com/fluidd-core/fluidd/blob/05e87ef288cc22b5180be052cf201fa68d8a0ccf/src/components/widgets/toolhead/ToolheadControlCross.vue#L261
    const setSpeed = !!amounts.speed ? amounts.speed : 10;
    let g1CommandAxes = "";
    if (!Number.isNaN(amounts.x)) {
      g1CommandAxes += ` X${amounts.x}`;
    }
    if (!Number.isNaN(amounts.y)) {
      g1CommandAxes += ` Y${amounts.y}`;
    }
    if (!Number.isNaN(amounts.z)) {
      g1CommandAxes += ` Z${amounts.z}`;
    }

    await this.client.postGcodeScript(
      this.login,
      `
      G91
      G1 ${g1CommandAxes} F${setSpeed}
      G90`
    );
  }

  async getFile(path: string): Promise<FileDto> {
    const metadata = await this.client.getServerFileMetadata(this.login, path);
    const file = metadata.data.result;
    return { size: file.size, path, date: file.modified };
  }

  async getFiles(): Promise<FileDto[]> {
    const files = await this.client.getServerFilesList(this.login);
    return files.data.result.map((f) => ({ size: f.size, path: f.path, date: f.modified }));
  }

  async homeAxes(axes: { x?: boolean; y?: boolean; z?: boolean }): Promise<void> {
    // Compare to https://github.com/fluidd-core/fluidd/blob/05e87ef288cc22b5180be052cf201fa68d8a0ccf/src/components/widgets/toolhead/ToolheadControlBarsAxis.vue#L86
    let homeCommand = `G28`;
    if (!!axes.x) {
      homeCommand += ` X`;
    }
    if (!!axes.y) {
      homeCommand += ` Y`;
    }
    if (!!axes.z) {
      homeCommand += ` Z`;
    }

    await this.client.postGcodeScript(this.login, homeCommand);
  }

  async downloadFile(path: string): AxiosPromise<NodeJS.ReadableStream> {
    return await this.client.getServerFilesDownload(this.login, "gcodes", path);
  }

  async getFileChunk(path: string, startBytes: number, endBytes: number): AxiosPromise<string> {
    return await this.client.getServerFilesDownloadChunk(this.login, "gcodes", path, startBytes, endBytes);
  }

  async uploadFile(fileOrBuffer: Buffer | Express.Multer.File, uploadToken?: string) {
    await this.client.postServerFileUpload(this.login, fileOrBuffer, uploadToken);
  }

  async deleteFile(path: string) {
    await this.client.deleteServerFile(this.login, "gcodes", path);
  }

  async deleteFolder(path: string) {
    await this.client.deleteServerFilesDirectory(this.login, path, false);
  }

  async getSettings() {
    const result = await this.client.getServerConfig(this.login);
    return result.data?.result;
  }

  async getReprintState(): Promise<PartialReprintFileDto> {
    const response = await this.client.getPrinterObjectsQuery<PrinterObjectsQueryDto<PrintStatsObject & WebhooksObject>>(
      this.login,
      {
        print_stats: [],
        webhooks: [],
      }
    );

    const result = response.data.result;
    const operational = result.status.webhooks.state === "ready";

    const response2 = await this.client.getServerHistoryList(this.login, 5, 0);
    const jobs = (response2.data?.result.jobs ?? []).sort((a, b) => (a.start_time > b.start_time ? 1 : 0));

    if (jobs.length === 0 || !operational) {
      return {
        connectionState: operational ? "Operational" : "Error",
        reprintState: ReprintState.NoLastPrint,
      };
    }

    const job = jobs[0];
    return {
      connectionState: "Operational",
      reprintState: ReprintState.LastPrintReady,
      file: {
        date: job.start_time,
        path: job.filename,
        size: job.metadata.size,
      },
    };
  }
}
