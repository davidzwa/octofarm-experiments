import axios from "axios";
import { Octokit } from "octokit";
import { asClass, asFunction, asValue, createContainer, InjectionMode, Resolver } from "awilix";
import { ToadScheduler } from "toad-scheduler";
import { DITokens } from "./container.tokens";
import { PrinterService } from "./services/mongoose/printer.service";
import { PrinterService as PrinterService2 } from "./services/orm/printer.service";
import { SettingsStore } from "./state/settings.store";
import { SettingsService } from "./services/mongoose/settings.service";
import { ServerReleaseService } from "./services/core/server-release.service";
import { TaskManagerService } from "./services/core/task-manager.service";
import { GithubService } from "./services/core/github.service";
import { FileCache } from "./state/file.cache";
import { PrinterWebsocketTask } from "./tasks/printer-websocket.task";
import { SocketIoTask } from "./tasks/socketio.task";
import { SocketFactory } from "./services/socket.factory";
import { PrinterFilesStore } from "./state/printer-files.store";
import { configureEventEmitter } from "./handlers/event-emitter";
import { AppConstants } from "./server.constants";
import { SoftwareUpdateTask } from "./tasks/software-update.task";
import { LoggerFactory } from "./handlers/logger-factory";
import { MulterService } from "./services/core/multer.service";
import { FileUploadTrackerCache } from "./state/file-upload-tracker.cache";
import { ServerHost } from "./server.host";
import { BootTask } from "./tasks/boot.task";
import { UserService } from "./services/mongoose/user.service";
import { UserService as UserService2 } from "./services/orm/user.service";
import { RoleService } from "./services/mongoose/role.service";
import { RoleService as RoleService2 } from "./services/orm/role.service";
import { ServerTasks } from "./tasks";
import { PermissionService } from "./services/mongoose/permission.service";
import { PermissionService as PermissionService2 } from "./services/orm/permission.service";
import { PrinterFileCleanTask } from "./tasks/printer-file-clean.task";
import { ROLES } from "./constants/authorization.constants";
import { CustomGcodeService } from "./services/mongoose/custom-gcode.service";
import { CustomGcodeService as CustomGcodeService2 } from "./services/orm/custom-gcode.service";
import { PrinterWebsocketRestoreTask } from "./tasks/printer-websocket-restore.task";
import { PluginFirmwareUpdateService } from "./services/octoprint/plugin-firmware-update.service";
import { PluginRepositoryCache } from "./services/octoprint/plugin-repository.cache";
import { configureCacheManager } from "./handlers/cache-manager";
import { ConfigService } from "./services/core/config.service";
import { PrintCompletionSocketIoTask } from "./tasks/print-completion.socketio.task";
import { PrintCompletionService } from "./services/mongoose/print-completion.service";
import { PrintCompletionService as PrintCompletionService2 } from "./services/orm/print-completion.service";
import { SocketIoGateway } from "./state/socket-io.gateway";
import { ClientBundleService } from "./services/core/client-bundle.service";
import { FloorService } from "./services/mongoose/floor.service";
import { FloorStore } from "./state/floor.store";
import { YamlService } from "./services/core/yaml.service";
import { MonsterPiService } from "./services/core/monsterpi.service";
import { BatchCallService } from "./services/core/batch-call.service";
import { ClientDistDownloadTask } from "./tasks/client-bundle.task";
import { OctoprintWebsocketAdapter } from "./services/octoprint/octoprint-websocket.adapter";
import { PrinterCache } from "./state/printer.cache";
import { PrinterSocketStore } from "./state/printer-socket.store";
import { TestPrinterSocketStore } from "./state/test-printer-socket.store";
import { PrinterEventsCache } from "./state/printer-events.cache";
import { LogDumpService } from "./services/core/logs-manager.service";
import { CameraStreamService as CameraService } from "./services/mongoose/camera-stream.service";
import { CameraStreamService as CameraService2 } from "./services/orm/camera-stream.service";
import { JwtService } from "./services/authentication/jwt.service";
import { AuthService } from "./services/authentication/auth.service";
import { RefreshTokenService } from "@/services/mongoose/refresh-token.service";
import { throttling } from "@octokit/plugin-throttling";
import { RefreshTokenService as RefreshToken2 } from "@/services/orm/refresh-token.service";
import { SettingsService2 } from "@/services/orm/settings.service";
import { FloorService as FloorService2 } from "@/services/orm/floor.service";
import { FloorPositionService } from "@/services/orm/floor-position.service";
import { TypeormService } from "@/services/typeorm/typeorm.service";
import { BuildResolver, DisposableResolver } from "awilix/lib/resolvers";
import { UserRoleService } from "@/services/orm/user-role.service";
import { PrinterGroupService } from "@/services/orm/printer-group.service";
import { MoonrakerClient } from "@/services/moonraker/moonraker.client";
import { MoonrakerWebsocketAdapter } from "@/services/moonraker/moonraker-websocket.adapter";
import { OctoprintApi } from "@/services/octoprint.api";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";
import { MoonrakerApi } from "@/services/moonraker.api";
import { PrinterApiFactory } from "@/services/printer-api.factory";
import { PrinterThumbnailCache } from "@/state/printer-thumbnail.cache";
import { BambuClient } from "@/services/bambu/bambu.client";
import { BambuMqttAdapter } from "@/services/bambu/bambu-mqtt.adapter";
import { BambuFtpAdapter } from "@/services/bambu/bambu-ftp.adapter";
import { BambuApi } from "@/services/bambu.api";

export function config<T1, T2>(
  key: string,
  experimentalMode: boolean,
  serviceTypeorm: BuildResolver<T2> & DisposableResolver<T2>,
  serviceMongoose?: (BuildResolver<T1> & DisposableResolver<T1>) | Resolver<T1>
) {
  return {
    [key]: experimentalMode ? serviceTypeorm : serviceMongoose,
  };
}

export function configureContainer(isSqlite: boolean = false) {
  // Create the container and set the injectionMode to PROXY (which is also the default).
  const container = createContainer({
    injectionMode: InjectionMode.PROXY,
  });

  const di = DITokens;

  container.register({
    // -- asValue/asFunction constants --
    [di.serverTasks]: asValue(ServerTasks),
    [di.isTypeormMode]: asValue(isSqlite),
    [di.appDefaultRole]: asValue(ROLES.GUEST),
    [di.appDefaultRoleNoLogin]: asValue(ROLES.ADMIN),
    [di.serverVersion]: asFunction(() => {
      return process.env[AppConstants.VERSION_KEY];
    }),
    [di.socketFactory]: asClass(SocketFactory).transient(), // Factory function, transient on purpose!

    // V1.6.0 capable services
    ...config(di.typeormService, isSqlite, asClass(TypeormService).singleton(), asValue(null)),
    ...config(di.settingsService, isSqlite, asClass(SettingsService2), asClass(SettingsService)),
    ...config(di.floorService, isSqlite, asClass(FloorService2).singleton(), asClass(FloorService).singleton()),
    ...config(di.floorPositionService, isSqlite, asClass(FloorPositionService).singleton(), asValue(null)),
    ...config(di.cameraStreamService, isSqlite, asClass(CameraService2).singleton(), asClass(CameraService).singleton()),
    ...config(di.printerService, isSqlite, asClass(PrinterService2), asClass(PrinterService)),
    ...config(di.printerGroupService, isSqlite, asClass(PrinterGroupService), asValue(null)),
    ...config(di.refreshTokenService, isSqlite, asClass(RefreshToken2).singleton(), asClass(RefreshTokenService).singleton()),
    ...config(di.userService, isSqlite, asClass(UserService2).singleton(), asClass(UserService).singleton()),
    ...config(di.userRoleService, isSqlite, asClass(UserRoleService).singleton(), asValue(null)),
    ...config(di.roleService, isSqlite, asClass(RoleService2).singleton(), asClass(RoleService).singleton()), // caches roles
    ...config(di.permissionService, isSqlite, asClass(PermissionService2).singleton(), asClass(PermissionService).singleton()), // caches roles
    ...config(di.customGCodeService, isSqlite, asClass(CustomGcodeService2).singleton(), asClass(CustomGcodeService).singleton()),
    ...config(
      di.printCompletionService,
      isSqlite,
      asClass(PrintCompletionService2).singleton(),
      asClass(PrintCompletionService).singleton()
    ),
    // -- asClass --
    [di.serverHost]: asClass(ServerHost).singleton(),
    [di.settingsStore]: asClass(SettingsStore).singleton(),
    [di.configService]: asClass(ConfigService),
    [di.authService]: asClass(AuthService).singleton(),
    [di.jwtService]: asClass(JwtService).singleton(),

    [di.loggerFactory]: asFunction(LoggerFactory).transient(),
    [di.taskManagerService]: asClass(TaskManagerService).singleton(),
    [di.toadScheduler]: asClass(ToadScheduler).singleton(),
    [di.eventEmitter2]: asFunction(configureEventEmitter).singleton(),
    [di.cacheManager]: asFunction(configureCacheManager).singleton(),
    [di.serverReleaseService]: asClass(ServerReleaseService).singleton(),
    [di.monsterPiService]: asClass(MonsterPiService).singleton(),
    [di.githubService]: asClass(GithubService),
    [di.octokitService]: asFunction((cradle: any) => {
      const config = cradle.configService;
      const CustomOctoKit = Octokit.plugin(throttling);
      return new CustomOctoKit({
        auth: config.get(AppConstants.GITHUB_PAT),
        throttle: {
          onRateLimit: (retryAfter, options, octokit, retryCount) => {
            const logger = LoggerFactory()("OctoKitThrottle");
            logger.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
          },
          onSecondaryRateLimit: (retryAfter, options, octokit) => {
            const logger = LoggerFactory()("OctoKitThrottle");
            // does not retry, only logs a warning
            logger.warn(`SecondaryRateLimit detected for request ${options.method} ${options.url}`);
          },
        },
      });
    }),
    [di.clientBundleService]: asClass(ClientBundleService),
    [di.logDumpService]: asClass(LogDumpService),
    [di.httpClient]: asValue(
      axios.create({
        maxBodyLength: 1000 * 1000 * 1000, // 1GB
        maxContentLength: 1000 * 1000 * 1000, // 1GB
      })
    ),

    [di.socketIoGateway]: asClass(SocketIoGateway).singleton(),
    [di.multerService]: asClass(MulterService).singleton(),
    [di.yamlService]: asClass(YamlService),
    [di.printerLogin]: asValue(null), // Fallback when no scope is provided
    [di.printerApiFactory]: asClass(PrinterApiFactory).transient(), // Factory function, transient on purpose!
    [di.octoprintApi]: asClass(OctoprintApi).transient(), // Transient on purpose
    [di.octoprintClient]: asClass(OctoprintClient).singleton(),
    [di.octoPrintSockIoAdapter]: asClass(OctoprintWebsocketAdapter).transient(), // Transient on purpose
    [di.moonrakerApi]: asClass(MoonrakerApi).transient(), // Transient on purpose
    [di.moonrakerClient]: asClass(MoonrakerClient).singleton(),
    [di.moonrakerWebsocketAdapter]: asClass(MoonrakerWebsocketAdapter).transient(), // Transient on purpose
    [di.bambuApi]: asClass(BambuApi).transient(),
    [di.bambuClient]: asClass(BambuClient).singleton(),
    [di.bambuFtpAdapter]: asClass(BambuFtpAdapter).transient(),
    [di.bambuMqttAdapter]: asClass(BambuMqttAdapter).transient(),
    [di.batchCallService]: asClass(BatchCallService).singleton(),
    [di.pluginFirmwareUpdateService]: asClass(PluginFirmwareUpdateService).singleton(),

    [di.floorStore]: asClass(FloorStore).singleton(),
    [di.pluginRepositoryCache]: asClass(PluginRepositoryCache).singleton(),
    [di.printerThumbnailCache]: asClass(PrinterThumbnailCache).singleton(),
    [di.fileCache]: asClass(FileCache).singleton(),
    [di.fileUploadTrackerCache]: asClass(FileUploadTrackerCache).singleton(),
    [di.printerFilesStore]: asClass(PrinterFilesStore).singleton(),
    [di.printerCache]: asClass(PrinterCache).singleton(),
    [di.printerEventsCache]: asClass(PrinterEventsCache).singleton(),
    [di.printerSocketStore]: asClass(PrinterSocketStore).singleton(),
    [di.testPrinterSocketStore]: asClass(TestPrinterSocketStore).singleton(),

    [di.bootTask]: asClass(BootTask),
    [di.softwareUpdateTask]: asClass(SoftwareUpdateTask), // Provided SSE handlers (couplers) shared with controllers
    [di.socketIoTask]: asClass(SocketIoTask).singleton(), // This task is a quick task (~100ms per printer)
    [di.clientDistDownloadTask]: asClass(ClientDistDownloadTask).singleton(),
    [di.printCompletionSocketIoTask]: asClass(PrintCompletionSocketIoTask).singleton(),
    [di.printerWebsocketTask]: asClass(PrinterWebsocketTask).singleton(), // This task is a recurring heartbeat task
    [di.printerWebsocketRestoreTask]: asClass(PrinterWebsocketRestoreTask).singleton(), // Task aimed at testing the printer API
    [di.printerFileCleanTask]: asClass(PrinterFileCleanTask).singleton(),
  });

  return container;
}
