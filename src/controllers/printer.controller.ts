import { before, DELETE, GET, PATCH, POST, route } from "awilix-express";
import { normalizeURLWithProtocol } from "@/utils/url.utils";
import { authenticate, authorizeRoles } from "@/middleware/authenticate";
import { getScopedPrinter, validateInput, validateMiddleware } from "@/handlers/validators";
import {
  createOctoPrintBackupRules,
  feedRateRules,
  flowRateRules,
  getOctoPrintBackupRules,
  testPrinterApiRules,
  updatePrinterConnectionSettingRules,
  updatePrinterDisabledReasonRules,
  updatePrinterEnabledRule,
} from "./validation/printer-controller.validation";
import { AppConstants } from "@/server.constants";
import { printerResolveMiddleware } from "@/middleware/printer";
import { generateCorrelationToken } from "@/utils/correlation-token.util";
import { ROLES } from "@/constants/authorization.constants";
import { PrinterAdapterStore } from "@/state/printer-adapter.store";
import { TestPrinterAdapterStore } from "@/state/test-printer-adapter.store";
import { PrinterCache } from "@/state/printer.cache";
import { LoggerService } from "@/handlers/logger";
import { PrinterEventsCache } from "@/state/printer-events.cache";
import { TaskManagerService } from "@/services/core/task-manager.service";
import { PluginRepositoryCache } from "@/services/octoprint/plugin-repository.cache";
import { FloorStore } from "@/state/floor.store";
import { MulterService } from "@/services/core/multer.service";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { Request, Response } from "express";
import { IPrinterService } from "@/services/interfaces/printer.service.interface";
import { LoginDto } from "@/services/interfaces/login.dto";
import { AxiosError } from "axios";
import { FailedDependencyException } from "@/exceptions/failed-dependency.exception";
import { InternalServerException } from "@/exceptions/runtime.exceptions";
import { MoonrakerClient } from "@/services/moonraker/moonraker.client";
import { IPrinterApi } from "@/services/printer-api.interface";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";
import { PrinterApiFactory } from "@/services/printer-api.factory";

@route(AppConstants.apiRoute + "/printer")
@before([authenticate(), authorizeRoles([ROLES.OPERATOR, ROLES.ADMIN]), printerResolveMiddleware()])
export class PrinterController {
  printerApiFactory: PrinterApiFactory;
  printerAdapterStore: PrinterAdapterStore;
  testPrinterAdapterStore: TestPrinterAdapterStore;
  printerService: IPrinterService;
  printerCache: PrinterCache;
  printerEventsCache: PrinterEventsCache;
  taskManagerService: TaskManagerService;
  printerApi: IPrinterApi;
  octoprintClient: OctoprintClient;
  moonrakerClient: MoonrakerClient;
  pluginRepositoryCache: PluginRepositoryCache;
  floorStore: FloorStore;
  multerService: MulterService;
  logger: LoggerService;

  constructor({
    printerApiFactory,
    printerAdapterStore,
    testPrinterAdapterStore,
    printerService,
    printerCache,
    printerEventsCache,
    taskManagerService,
    loggerFactory,
    printerApi,
    moonrakerClient,
    octoprintClient,
    pluginRepositoryCache,
    floorStore,
    multerService,
  }: {
    printerApiFactory: PrinterApiFactory;
    printerAdapterStore: PrinterAdapterStore;
    testPrinterAdapterStore: TestPrinterAdapterStore;
    printerService: IPrinterService;
    printerCache: PrinterCache;
    printerEventsCache: PrinterEventsCache;
    taskManagerService: TaskManagerService;
    loggerFactory: ILoggerFactory;
    printerApi: IPrinterApi;
    octoprintClient: OctoprintClient;
    moonrakerClient: MoonrakerClient;
    pluginRepositoryCache: PluginRepositoryCache;
    floorStore: FloorStore;
    multerService: MulterService;
  }) {
    this.logger = loggerFactory(PrinterController.name);
    this.printerApiFactory = printerApiFactory;
    this.printerCache = printerCache;
    this.printerEventsCache = printerEventsCache;
    this.printerService = printerService;
    this.printerAdapterStore = printerAdapterStore;
    this.testPrinterAdapterStore = testPrinterAdapterStore;
    this.taskManagerService = taskManagerService;
    this.printerApi = printerApi;
    this.octoprintClient = octoprintClient;
    this.moonrakerClient = moonrakerClient;
    this.pluginRepositoryCache = pluginRepositoryCache;
    this.floorStore = floorStore;
    this.multerService = multerService;
  }

  @GET()
  @route("/")
  async list(req: Request, res: Response) {
    res.send(await this.printerCache.listCachedPrinters(true));
  }

  @POST()
  @route("/")
  async create(req: Request, res: Response) {
    const newPrinter = req.body;
    if (req.query.forceSave !== "true") {
      await this.testPrintApiConnection(newPrinter);
    }

    // Has internal validation, but might add some here above as well
    const createdPrinter = await this.printerService.create(newPrinter);
    res.send(await this.printerCache.getCachedPrinterOrThrowAsync(createdPrinter.id));
  }

  @POST()
  @route("/batch")
  async createBatch(req: Request, res: Response) {
    const importResult = await this.printerService.batchImport(req.body);
    res.send(importResult);
  }

  /**
   * This list should move to generic controller
   */
  @GET()
  @route("/plugin-list")
  async getPluginList(req: Request, res: Response) {
    const pluginList = this.pluginRepositoryCache.getCache();
    res.send(pluginList);
  }

  @GET()
  @route("/:id")
  async getPrinter(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    res.send(await this.printerCache.getCachedPrinterOrThrowAsync(currentPrinterId));
  }

  @GET()
  @route("/:id/socket")
  async getPrinterSocketInfo(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    res.send(await this.printerEventsCache.getPrinterSocketEvents(currentPrinterId));
  }

  @PATCH()
  @route("/:id")
  async update(req: Request, res: Response) {
    const forceSave = req.query.forceSave !== "true";

    // Update the printer entity: printerURL, name, apiKey, enabled
    const { currentPrinterId } = getScopedPrinter(req);
    const updatedPrinter = req.body;
    if (!forceSave) {
      await this.testPrintApiConnection(updatedPrinter);
    }

    await this.printerService.update(currentPrinterId, updatedPrinter);
    res.send(await this.printerCache.getCachedPrinterOrThrowAsync(currentPrinterId));
  }

  @DELETE()
  @route("/:id")
  async delete(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    const result = await this.printerService.delete(currentPrinterId);
    await this.floorStore.removePrinterFromAnyFloor(currentPrinterId);
    res.send(result);
  }

  @PATCH()
  @route("/:id/enabled")
  async updateEnabled(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    const data = await validateMiddleware(req, updatePrinterEnabledRule);
    await this.printerService.updateEnabled(currentPrinterId, data.enabled);
    res.send({});
  }

  @PATCH()
  @route("/:id/disabled-reason")
  async updatePrinterDisabledReason(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    const data = await validateMiddleware(req, updatePrinterDisabledReasonRules);
    await this.printerService.updateDisabledReason(currentPrinterId, data.disabledReason);
    res.send({});
  }

  @PATCH()
  @route("/:id/connection")
  async updateConnectionSettings(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    const inputData = await validateMiddleware(req, updatePrinterConnectionSettingRules);

    if (req.query.forceSave !== "true") {
      await this.testPrintApiConnection(inputData);
    }

    const newEntity = await this.printerService.updateConnectionSettings(currentPrinterId, inputData);
    res.send({
      printerURL: newEntity.printerURL,
      apiKey: newEntity.apiKey,
      printerType: newEntity.printerType,
    });
  }

  @POST()
  @route("/:id/refresh-socket")
  async refreshPrinterSocket(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    this.logger.log(`Refresh called by user for printer ${this.printerApi.login.printerURL} and id ${currentPrinterId}`);

    this.printerAdapterStore.adapterAllowEmittingEvents(currentPrinterId, false);
    await this.printerEventsCache.deletePrinterSocketEvents(currentPrinterId);
    await this.printerAdapterStore.reconnectAdapter(currentPrinterId);

    this.logger.log(`Refresh request returned`);
    res.send({});
  }

  @POST()
  @route("/test-connection")
  async testConnection(req: Request, res: Response) {
    if (req.body.printerURL?.length) {
      req.body.printerURL = normalizeURLWithProtocol(req.body.printerURL);
    }
    const newPrinter = await validateMiddleware(req, testPrinterApiRules);
    newPrinter.correlationToken = generateCorrelationToken();
    this.logger.log(`Testing printer with correlation token ${newPrinter.correlationToken}`);

    // Add printer with test=true
    try {
      await this.testPrinterAdapterStore.setupTestPrinter(newPrinter);
    } catch (e) {
      res.send({ correlationToken: newPrinter.correlationToken, failure: true, error: e.toString() });
      return;
    }
    res.send({ correlationToken: newPrinter.correlationToken });
  }

  @GET()
  @route("/:id/login-details")
  async getPrinterLoginDetails(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    res.send(printerLogin);
  }

  @POST()
  @route("/:id/serial-connect")
  async sendSerialConnectCommand(req: Request, res: Response) {
    await this.printerApi.connect();
    res.send({});
  }

  @POST()
  @route("/:id/serial-disconnect")
  async sendSerialDisconnectCommand(req: Request, res: Response) {
    await this.printerApi.disconnect();
    res.send({});
  }

  @POST()
  @route("/:id/jog")
  @route("/:id/move")
  async movePrintHead(req: Request, res: Response) {
    await this.printerApi.movePrintHead(req.body);
    res.send({});
  }

  @POST()
  @route("/:id/home")
  async homeAxes(req: Request, res: Response) {
    await this.printerApi.homeAxes(req.body);
    res.send({});
  }

  @POST()
  @route("/:id/job/pause")
  async pausePrint(req: Request, res: Response) {
    await this.printerApi.pausePrint();
    res.send({});
  }

  @POST()
  @route("/:id/job/resume")
  async resumePrint(req: Request, res: Response) {
    await this.printerApi.resumePrint();
    res.send({});
  }

  @POST()
  @route("/:id/job/stop")
  @route("/:id/job/cancel")
  async cancelPrint(req: Request, res: Response) {
    await this.printerApi.cancelPrint();
    res.send({});
  }

  @POST()
  @route("/:id/octoprint/server/restart")
  @route("/:id/server/restart")
  async restartServer(req: Request, res: Response) {
    await this.printerApi.restartServer();
    res.send();
  }

  private async testPrintApiConnection(inputLoginDto: LoginDto) {
    await validateInput(inputLoginDto, updatePrinterConnectionSettingRules);
    try {
      if (this.printerApi) {
        await this.printerApi.getVersion();
      } else {
        const printerApi = this.printerApiFactory.getScopedPrinter(inputLoginDto);
        await printerApi.getVersion();
      }
    } catch (e) {
      this.logger.log("Printer version test failed");

      if (e instanceof AxiosError) {
        this.logger.debug(e.message + " " + e.status + " " + e.response?.status);
        switch (e.response?.status) {
          case 404:
            // Bad code design or wrong service type
            break;
          case 401:
          case 403: {
            throw new FailedDependencyException("Authentication failed", e.response?.status);
          }
          case 0:
          case 502:
          case 503: {
            throw new FailedDependencyException("Printer service unreachable", e.response?.status);
          }
          default: {
            if (!e.response?.status) {
              // F.e. http://localhost:1324
              // ENOTFOUND: DNS problem
              // ECONNREFUSED: Port has no socket bound
              // ERR_BAD_REQUEST
              throw new FailedDependencyException(`Reaching Printer service failed without status (code ${e.code})`);
            } else {
              throw new FailedDependencyException(
                `Reaching Printer service failed with status (code ${e.code})`,
                e.response?.status
              );
            }
          }
        }
      }

      throw new InternalServerException(`Could not call Printer service, internal problem`, (e as Error).stack);
    }
  }

  @PATCH()
  @route("/:id/feed-rate")
  async setFeedRate(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    const data = await validateMiddleware(req, feedRateRules);

    await this.printerService.updateFeedRate(currentPrinterId, data.feedRate);
    res.send({});
  }

  @PATCH()
  @route("/:id/flow-rate")
  async setFlowRate(req: Request, res: Response) {
    const { currentPrinterId } = getScopedPrinter(req);
    const data = await validateMiddleware(req, flowRateRules);
    await this.printerService.updateFlowRate(currentPrinterId, data.flowRate);
    res.send({});
  }

  @GET()
  @route("/:id/plugin-list")
  async getPrinterPluginList(req: Request, res: Response) {
    // List installed plugins (OP 1.6.0+)
    const { printerLogin } = getScopedPrinter(req);
    const pluginList = await this.octoprintClient.getPluginManagerPlugins(printerLogin);
    res.send(pluginList);
  }

  @GET()
  @route("/:id/octoprint/backup")
  async getOctoPrintBackupOverview(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    const backupOverview = await this.octoprintClient.getBackupOverview(printerLogin);
    res.send(backupOverview);
  }

  @GET()
  @route("/:id/octoprint/backup/list")
  async listOctoPrintBackups(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    const backupOverview = await this.octoprintClient.getBackups(printerLogin);
    res.send(backupOverview);
  }

  @POST()
  @route("/:id/octoprint/backup/create")
  async createOctoPrintBackup(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    const { exclude } = await validateMiddleware(req, createOctoPrintBackupRules);
    const response = await this.octoprintClient.createBackup(printerLogin, exclude);
    res.send(response);
  }

  @POST()
  @route("/:id/octoprint/backup/download")
  async downloadOctoPrintBackup(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    const { fileName } = await validateMiddleware(req, getOctoPrintBackupRules);
    const dataStream = await this.octoprintClient.getDownloadBackupStream(printerLogin, fileName);
    dataStream.pipe(res);
  }

  @POST()
  @route("/:id/octoprint/backup/restore")
  async restoreOctoPrintBackup(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    const files = await this.multerService.multerLoadFileAsync(req, res, null, false);
    const response = await this.octoprintClient.forwardRestoreBackupFileStream(printerLogin, files[0].buffer);
    res.send(response.data);
  }

  @DELETE()
  @route("/:id/octoprint/backup/delete")
  async deleteOctoPrintBackup(req: Request, res: Response) {
    const { printerLogin } = getScopedPrinter(req);
    const { fileName } = await validateMiddleware(req, getOctoPrintBackupRules);
    const response = await this.octoprintClient.deleteBackup(printerLogin, fileName);
    res.send(response);
  }
}
