const { ensureAuthenticated } = require("../middleware/auth");
const { createController } = require("awilix-express");
const { validateMiddleware, validateInput } = require("../handlers/validators");
const {
  updateSortIndexRules,
  updatePrinterConnectionSettingRules,
  stepSizeRules,
  flowRateRules,
  feedRateRules,
  updatePrinterEnabledRule
} = require("./validation/printer-controller.validation");
const { AppConstants } = require("../app.constants");
const { convertHttpUrlToWebsocket } = require("../utils/url.utils");
const { NotImplementedException } = require("../exceptions/runtime.exceptions");
const { idRules } = require("./validation/generic.validation");

class PrinterController {
  #printersStore;
  #jobsCache;
  #connectionLogsCache;
  #octoPrintApiService;
  #fileCache;
  #sseHandler;
  #sseTask;

  #logger;

  constructor({
                printersStore,
                connectionLogsCache,
                printerSseHandler,
                printerSseTask,
                loggerFactory,
                octoPrintApiService,
                jobsCache,
                fileCache
              }) {
    this.#logger = loggerFactory("Server-API");

    this.#printersStore = printersStore;
    this.#jobsCache = jobsCache;
    this.#connectionLogsCache = connectionLogsCache;
    this.#octoPrintApiService = octoPrintApiService;
    this.#fileCache = fileCache;
    this.#sseHandler = printerSseHandler;
    this.#sseTask = printerSseTask;
  }

  async sse(req, res) {
    this.#sseHandler.handleRequest(req, res);
    await this.#sseTask.run();
  }

  /**
   * Previous printerInfo action (not a list function)
   * @param req
   * @param res
   * @returns {Promise<void>}
   */
  async get(req, res) {
    const { id: printerId } = await validateInput(req.params, idRules);

    const foundPrinter = this.#printersStore.getPrinterFlat(printerId);

    res.send(foundPrinter);
  }

  async testConnection(req, res) {
    const newPrinter = req.body;
    if (!newPrinter.webSocketURL) {
      newPrinter.webSocketURL = convertHttpUrlToWebsocket(newPrinter.printerURL);
    }

    // As we dont generate a _id we generate a correlation token
    newPrinter.correlationToken = Math.random().toString(36).slice(2);

    this.#logger.info("Testing printer", newPrinter);

    // Add printer with test=true
    const printerState = await this.#printersStore.setupTestPrinter(newPrinter);
    res.send(printerState.toFlat());
  }

  async create(req, res) {
    const newPrinter = req.body;
    if (!newPrinter.webSocketURL) {
      newPrinter.webSocketURL = convertHttpUrlToWebsocket(newPrinter.printerURL);
    }

    this.#logger.info("Add printer", newPrinter);

    // Has internal validation, but might add some here above as well
    const printerState = await this.#printersStore.addPrinter(newPrinter);
    res.send(printerState.toFlat());
  }

  async list(req, res) {
    const listedPrinters = this.#printersStore.listPrintersFlat();

    res.send(listedPrinters);
  }

  async delete(req, res) {
    const data = await validateInput(req.params, idRules);
    const printerId = data.id;
    this.#logger.info("Deleting printer with id", printerId);

    const result = await this.#printersStore.deletePrinter(printerId);

    res.send(result);
  }

  /**
   * Update the printer network connection settings like URL or apiKey - nothing else
   * @param req
   * @param res
   * @returns {Promise<void>}
   */
  async updateConnectionSettings(req, res) {
    const data = await validateMiddleware(req, updatePrinterConnectionSettingRules, res);

    const printerId = data.printer.id;
    const newEntity = await this.#printersStore.updatePrinterConnectionSettings(
      printerId,
      data.printer
    );

    res.send({
      printerURL: newEntity.printerURL,
      camURL: newEntity.camURL,
      apiKey: newEntity.apiKey,
      webSocketURL: newEntity.webSocketURL
    });
  }

  async updateSortIndex(req, res) {
    const data = await validateMiddleware(req, updateSortIndexRules, res);

    this.#logger.info("Sorting printers according to provided order", JSON.stringify(data));

    this.#printersStore.updateSortIndex(data.sortList);
    res.send({});
  }

  async updateEnabled(req, res) {
    const params = await validateInput(req.params, idRules);
    const data = await validateMiddleware(req, updatePrinterEnabledRule, res);

    this.#logger.info("Changing printer enabled setting", JSON.stringify(data));

    await this.#printersStore.updateEnabled(params.id, data.enabled);
    res.send({});
  }

  async reconnect(req, res) {
    const printerID = req.params.id;
    this.#logger.info("Reconnecting OctoPrint instance: ", printerID);
    this.#printersStore.reconnectOctoPrint(printerID, true);

    res.send({ success: true, message: "Printer will reconnect soon" });
  }

  async setStepSize(req, res) {
    const params = await validateInput(req.params, idRules);
    const data = await validateMiddleware(req, stepSizeRules, res);

    this.#printersStore.setPrinterStepSize(params.id, data.stepSize);
    res.send();
  }

  async setFeedRate(req, res) {
    const params = await validateInput(req.params, idRules);
    const data = await validateMiddleware(req, feedRateRules, res);

    await this.#printersStore.setPrinterFeedRate(params.id, data.feedRate);
    res.send();
  }

  async setFlowRate(req, res) {
    const params = await validateInput(req.params, idRules);
    const data = await validateMiddleware(req, flowRateRules, res);

    await this.#printersStore.setPrinterFlowRate(params.id, data.flowRate);
    res.send();
  }

  async resetPowerSettings(req, res) {
    const params = await validateInput(req.params, idRules);

    const defaultPowerSettings = await this.#printersStore.resetPrinterPowerSettings(params.id);

    res.send({ powerSettings: defaultPowerSettings });
  }

  /**
   * WIP quite slow (100ms+) - compatible to /updatePrinterSettings
   * @param req
   * @param res
   * @returns {Promise<void>}
   */
  async querySettings(req, res) {
    const params = await validateInput(req.params, idRules);

    const printerState = this.#printersStore.getPrinterState(params.id);
    const printerLogin = printerState.getLoginDetails();

    // TODO We dont process these yet
    const octoPrintConnection = await this.#octoPrintApiService.getConnection(printerLogin);
    const octoPrintSettings = await this.#octoPrintApiService.getSettings(printerLogin);
    const octoPrintSystemInfo = await this.#octoPrintApiService.getSystemInfo(printerLogin);
    // await Runner.getLatestOctoPrintSettingsValues(id);

    res.send({ printerInformation: printerState.toFlat() });
  }

  // TODO === The big todo line ===
  async updateSettings(req, res) {
    const params = await validateInput(req.params, idRules);

    throw new NotImplementedException("Update settings is being split up.");

    // TODO implement as partials (broken right now)
    const settings = req.body;
    this.#logger.info("Update printers request: ", settings);
    const updateSettings = await Runner.updateSettings(settings);
    res.send({ status: updateSettings.status, printer: updateSettings.printer });
  }

  async getConnectionLogs(req, res) {
    const params = await validateInput(req.params, idRules);

    const printerId = params.id;
    this.#logger.info("Grabbing connection logs for: ", printerId);
    let connectionLogs = this.#connectionLogsCache.getPrinterConnectionLogs(printerId);

    res.send(connectionLogs);
  }

  async getPluginList(req, res) {
    const params = await validateInput(req.params, idRules);

    this.#logger.info("Grabbing plugin list for: ", params.id);

    const printerState = this.#printersStore.getPrinterState(params.id);
    const printerLogin = printerState.getLoginDetails();

    let pluginList = await this.#octoPrintApiService.getPluginManager(printerLogin, false);
    res.send(pluginList);
  }
}

// prettier-ignore
module.exports = createController(PrinterController)
  .prefix(AppConstants.apiRoute + "/printer")
  .before([ensureAuthenticated])
  .get("/", "list")
  .get("/sse", "sse")
  .post("/", "create")
  .post("/test-connection", "testConnection")
  .get("/:id", "get")
  .delete("/:id", "delete")
  .patch("/sort-index", "updateSortIndex")
  .patch("/:id/enabled", "updateEnabled")
  .put("/:id/reconnect", "reconnect")
  .patch("/:id/connection", "updateConnectionSettings")
  .patch("/:id/step-size", "setStepSize")
  .patch("/:id/flow-rate", "setFlowRate")
  .patch("/:id/feed-rate", "setFeedRate")
  .patch("/:id/reset-power-settings", "resetPowerSettings")
  // WIP line
  .post("/:id/query-settings", "querySettings")
  .patch("/:id/update-settings", "updateSettings")
  .get("/:id/connection-logs/", "getConnectionLogs")
  .get("/:id/plugin-list", "getPluginList");
