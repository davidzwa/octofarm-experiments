const awilix = require("awilix");
const axios = require("axios");
const DITokens = require("./container.tokens");
const PrinterService = require("./services/printer.service");
const PrinterGroupService = require("./services/printer-group.service");
const PrintersStore = require("./state/printers.store");
const SettingsStore = require("./state/settings.store");
const ServerSettingsService = require("./services/server-settings.service");
const ClientSettingsService = require("./services/client-settings.service");
const ServerUpdateService = require("./services/server-update.service");
const InfluxDbSetupService = require("./services/influx/influx-db-setup.service");
const ScriptService = require("./services/script.service");
const TaskManagerService = require("./services/task-manager.service");
const SystemInfoStore = require("./state/system-info.store");
const SystemCommandsService = require("./services/system-commands.service");
const ServerLogsService = require("./services/server-logs.service");
const SystemInfoBundleService = require("./services/system-info-bundle.service");
const GithubApiService = require("./services/github-api.service");
const HistoryService = require("./services/history.service");
const FarmStatisticsService = require("./services/farm-statistics.service");
const FileCache = require("./state/data/file.cache");
const HistoryCache = require("./state/data/history.cache");
const JobsCache = require("./state/data/jobs.cache");
const UserTokenService = require("./services/authentication/user-token.service");
const ServerSentEventsHandler = require("./handlers/sse.handler");
const PrinterFilesTask = require("./tasks/printer-files.task");
const PrinterTickerStore = require("./state/printer-ticker.store");
const PrinterWebsocketTask = require("./tasks/printer-websocket.task");
const PrinterSseTask = require("./tasks/printer-sse.task");
const SortingFilteringCache = require("./state/data/sorting-filtering.cache");
const CurrentOperationsCache = require("./state/data/current-operations.cache");
const PrinterSystemTask = require("./tasks/printer-system.task");
const OctoPrintApiService = require("./services/octoprint/octoprint-api.service");
const FilamentManagerPluginService = require("./services/octoprint/filament-manager-plugin.service");
const FilamentCache = require("./state/data/filament.cache");
const PrinterState = require("./state/printer.state");
const PrinterStateFactory = require("./state/printer-state.factory");
const FilesStore = require("./state/files.store");
const FilamentStore = require("./state/filament.store");
const HeatMapCache = require("./state/data/heatmap.cache");
const InfluxDbHistoryService = require("./services/influx/influx-db-history.service");
const InfluxDbFilamentService = require("./services/influx/influx-db-filament.service");
const InfluxDbPrinterStateService = require("./services/influx/influx-db-printer-state.service");
const { configureEventEmitter } = require("./handlers/event-emitter");
const { AppConstants } = require("./app.constants");
const PrinterFilesService = require("./services/printer-files.service");
const SoftwareUpdateTask = require("./tasks/software-update.task");
const AutoDiscoveryService = require("./services/auto-discovery.service");
const ConnectionLogsCache = require("./state/data/connection-logs.cache");
const DashboardStatisticsCache = require("./state/data/dashboard-statistics.cache");
const AlertService = require("./services/alert.service");
const { asFunction, asClass, asValue, createContainer, InjectionMode } = require("awilix");
const LoggerFactory = require("./handlers/logger-factory");

function configureContainer() {
  // Create the container and set the injectionMode to PROXY (which is also the default).
  const container = createContainer({
    injectionMode: InjectionMode.PROXY
  });

  container.register({
    // -- asValue --
    // Here we are telling awilix that the dependency is a value, pretty neat way to solidify data
    serverVersion: asValue(
      process.env[AppConstants.VERSION_KEY] || AppConstants.defaultServerPageTitle
    ),
    appConstants: asClass(AppConstants).singleton(),
    serverPageTitle: asValue(process.env[AppConstants.SERVER_SITE_TITLE_KEY]),

    // -- asFunction --
    // Resolve dependencies by calling a function (synchronous or asynchronous)
    // Use cases: factories, or dynamic configuration from external sources
    //
    // Factory:
    // We tell awilix that this will create "something" during runtime in this case it will create instances of PrinterState
    // A name tells a lot (PrinterStateFactory => PrinterState)
    // The resulting instances are not globally available per se. That's up to us.
    // We just need something to manage it afterwards, otherwise we might lose reference to it.
    // In this case we save it to PrintersStore:
    // TL;DR we can dynamically create injectable dependencies just fine using awilix.
    [DITokens.printerStateFactory]: asFunction(PrinterStateFactory).transient(), // Factory function, transient on purpose!

    // -- asClass --
    // Below we are telling Awilix how to resolve a dependency class:
    // This means "constructing on demand", so during code runtime. THIS HAS A RISK you need to be aware of.
    // When a dependency is not known this causes an awilix Resolution Error. Testing this is easy peasy though.
    // A good way is validating some at startup by hand or automatically (increasing boot time uselessly).
    // Or trust you did the right thing. All options are fine.
    //
    // Register a class by instantiating a class using asClass and caching it with .singleton()
    // Other flavours are: .transient() (default, volatile instance) and .scoped() (conditionally volatile)
    // scoping is usually done for request API middleware to ensure f.e. that current user is set or group/tenant/roles/etc
    // Therefore scoping can influence how many requests per sec the API can handle... in case you're interested to know.
    [DITokens.settingsStore]: asClass(SettingsStore).singleton(),
    [DITokens.serverSettingsService]: asClass(ServerSettingsService),
    clientSettingsService: asClass(ClientSettingsService),
    userTokenService: asClass(UserTokenService).singleton(),

    [DITokens.loggerFactory]: asFunction(LoggerFactory).transient(),
    taskManagerService: asClass(TaskManagerService).singleton(),
    eventEmitter2: awilix.asFunction(configureEventEmitter).singleton(),
    [DITokens.serverUpdateService]: asClass(ServerUpdateService).singleton(),
    [DITokens.systemInfoStore]: asClass(SystemInfoStore).singleton(),
    [DITokens.githubApiService]: asClass(GithubApiService),
    [DITokens.autoDiscoveryService]: asClass(AutoDiscoveryService),
    [DITokens.systemCommandsService]: asClass(SystemCommandsService),
    serverLogsService: asClass(ServerLogsService),
    systemInfoBundleService: asClass(SystemInfoBundleService),
    [DITokens.httpClient]: awilix.asValue(axios),

    [DITokens.printerService]: asClass(PrinterService),
    [DITokens.printerFilesService]: asClass(PrinterFilesService),
    [DITokens.printerGroupService]: asClass(PrinterGroupService),
    [DITokens.octoPrintApiService]: asClass(OctoPrintApiService).singleton(),
    [DITokens.filamentManagerPluginService]: asClass(FilamentManagerPluginService),
    [DITokens.historyService]: asClass(HistoryService),
    [DITokens.farmStatisticsService]: asClass(FarmStatisticsService),
    [DITokens.dashboardStatisticsCache]: asClass(DashboardStatisticsCache),
    [DITokens.filamentCache]: asClass(FilamentCache).singleton(),
    [DITokens.sortingFilteringCache]: asClass(SortingFilteringCache).singleton(),
    [DITokens.currentOperationsCache]: asClass(CurrentOperationsCache).singleton(),
    [DITokens.printerState]: asClass(PrinterState).transient(), // Transient on purpose!
    [DITokens.historyCache]: asClass(HistoryCache).singleton(),
    [DITokens.jobsCache]: asClass(JobsCache).singleton(),
    [DITokens.heatMapCache]: asClass(HeatMapCache).singleton(),
    [DITokens.connectionLogsCache]: asClass(ConnectionLogsCache).singleton(),
    printerTickerStore: asClass(PrinterTickerStore).singleton(),
    [DITokens.fileCache]: asClass(FileCache).singleton(),
    filamentStore: asClass(FilamentStore), // No need for singleton as its now based on filamentCache
    [DITokens.filesStore]: asClass(FilesStore).singleton(),
    [DITokens.printersStore]: asClass(PrintersStore).singleton(),

    // Extensibility and export
    [DITokens.alertService]: asClass(AlertService),
    [DITokens.scriptService]: asClass(ScriptService),
    [DITokens.influxDbSetupService]: asClass(InfluxDbSetupService).singleton(),
    [DITokens.influxDbFilamentService]: asClass(InfluxDbFilamentService),
    [DITokens.influxDbHistoryService]: asClass(InfluxDbHistoryService),
    [DITokens.influxDbPrinterStateService]: asClass(InfluxDbPrinterStateService),

    softwareUpdateTask: asClass(SoftwareUpdateTask),
    // Provided SSE handlers (couplers) shared with controllers
    printerSseHandler: asClass(ServerSentEventsHandler).singleton(),
    // Task bound to send on SSE Handler
    [DITokens.printerSseTask]: asClass(PrinterSseTask).singleton(),
    // Normal post-analysis operations (previously called cleaners)
    printerFilesTask: asClass(PrinterFilesTask).singleton(),
    // This task is a quick task (~100ms per printer)
    printerWebsocketTask: asClass(PrinterWebsocketTask).singleton(),
    // Task dependent on WS to fire - disabled at boot
    [DITokens.printerSystemTask]: asClass(PrinterSystemTask).singleton()
  });

  return container;
}

module.exports = {
  configureContainer
};
