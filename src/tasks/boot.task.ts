import mongoose, { connect, syncIndexes } from "mongoose";
import { fetchMongoDBConnectionString, runMigrations } from "@/server.env";
import { DITokens } from "@/container.tokens";
import { AppConstants } from "@/server.constants";
import { LoggerService } from "@/handlers/logger";
import { TaskManagerService } from "@/services/core/task-manager.service";
import { ServerTasks } from "@/tasks";
import { MulterService } from "@/services/core/multer.service";
import { SettingsStore } from "@/state/settings.store";
import { FloorStore } from "@/state/floor.store";
import { ConfigService } from "@/services/core/config.service";
import { PrinterAdapterStore } from "@/state/printer-adapter.store";
import { PrinterFilesStore } from "@/state/printer-files.store";
import { PermissionService } from "@/services/mongoose/permission.service";
import { RoleService } from "@/services/mongoose/role.service";
import { UserService } from "@/services/mongoose/user.service";
import { PluginRepositoryCache } from "@/services/octoprint/plugin-repository.cache";
import { ClientBundleService } from "@/services/core/client-bundle.service";
import { TypeormService } from "@/services/typeorm/typeorm.service";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { ISettingsService } from "@/services/interfaces/settings.service.interface";
import { PrinterThumbnailCache } from "@/state/printer-thumbnail.cache";
import { OctoprintType } from "@/services/printer-api.interface";
import { WebSocketAdapter } from "@/services/redesign/3-claude-srp/websocket.adapter";
import { Data } from "ws";
import { RecordingWebSocket } from "@/services/redesign/3-claude-srp/record-replay/recording.websocket";
import { writeFileSync } from "node:fs";
import { readFileSync } from "fs";
import { WebsocketRecording } from "@/services/redesign/3-claude-srp/record-replay/websocket.recording";
import { sleep } from "@/utils/time.utils";
import { InMemoryRecordingStorage } from "@/services/redesign/3-claude-srp/record-replay/recording.storage";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";

export class BootTask {
  logger: LoggerService;
  taskManagerService: TaskManagerService;
  serverTasks: ServerTasks;
  settingsStore: SettingsStore;
  settingsService: ISettingsService;
  multerService: MulterService;
  printerAdapterStore: PrinterAdapterStore;
  printerFilesStore: PrinterFilesStore;
  permissionService: PermissionService;
  roleService: RoleService;
  userService: UserService;
  octoprintClient: OctoprintClient;
  pluginRepositoryCache: PluginRepositoryCache;
  floorStore: FloorStore;
  clientBundleService: ClientBundleService;
  configService: ConfigService;
  isTypeormMode: boolean;
  typeormService: TypeormService;
  printerThumbnailCache: PrinterThumbnailCache;

  constructor({
    loggerFactory,
    serverTasks,
    settingsService,
    settingsStore,
    multerService,
    printerAdapterStore,
    printerFilesStore,
    permissionService,
    roleService,
    userService,
    octoprintClient,
    taskManagerService,
    pluginRepositoryCache,
    floorStore,
    clientBundleService,
    configService,
    typeormService,
    isTypeormMode,
    printerThumbnailCache,
  }: {
    loggerFactory: ILoggerFactory;
    serverTasks: ServerTasks;
    settingsService: ISettingsService;
    settingsStore: SettingsStore;
    multerService: MulterService;
    printerAdapterStore: PrinterAdapterStore;
    printerFilesStore: PrinterFilesStore;
    permissionService: PermissionService;
    roleService: RoleService;
    userService: UserService;
    octoprintClient: OctoprintClient;
    taskManagerService: TaskManagerService;
    pluginRepositoryCache: PluginRepositoryCache;
    floorStore: FloorStore;
    clientBundleService: ClientBundleService;
    configService: ConfigService;
    typeormService: TypeormService;
    isTypeormMode: boolean;
    printerThumbnailCache: PrinterThumbnailCache;
  }) {
    this.isTypeormMode = isTypeormMode;
    this.logger = loggerFactory(BootTask.name);
    this.serverTasks = serverTasks;
    this.settingsService = settingsService;
    this.settingsStore = settingsStore;
    this.multerService = multerService;
    this.printerAdapterStore = printerAdapterStore;
    this.printerFilesStore = printerFilesStore;
    this.permissionService = permissionService;
    this.roleService = roleService;
    this.userService = userService;
    this.octoprintClient = octoprintClient;
    this.taskManagerService = taskManagerService;
    this.pluginRepositoryCache = pluginRepositoryCache;
    this.floorStore = floorStore;
    this.clientBundleService = clientBundleService;
    this.configService = configService;
    this.typeormService = typeormService;
    this.printerThumbnailCache = printerThumbnailCache;
  }

  async runOnce() {
    // To cope with retries after failures we register this task - disabled
    this.taskManagerService.registerJobOrTask(this.serverTasks.SERVER_BOOT_TASK);

    this.logger.log("Running boot task once.");
    await this.run();
  }

  async run() {
    if (this.isTypeormMode) {
      await this.typeormService.createConnection();
    } else {
      try {
        await this.createConnection();
        await this.migrateDatabase();
      } catch (e) {
        if (e instanceof mongoose.Error) {
          // Tests should just continue
          if (!e.message.includes("Can't call `openUri()` on an active connection with different connection strings.")) {
            // We are not in a test
            if (e.message.includes("ECONNREFUSED")) {
              this.logger.error("Database connection timed-out. Retrying in 5000.");
            } else {
              this.logger.error(`Database connection error: ${e.message}`);
            }
            this.taskManagerService.scheduleDisabledJob(DITokens.bootTask, false);
            return;
          }
        }
      }
    }

    this.logger.log("Loading and synchronizing Server Settings");
    await this.settingsStore.loadSettings();

    this.logger.log("Synchronizing user permission and roles definition");
    await this.permissionService.syncPermissions();
    await this.roleService.syncRoles();

    const isDemoMode = this.configService.isDemoMode();
    if (isDemoMode) {
      this.logger.warn(`Starting in demo mode due to ${AppConstants.OVERRIDE_IS_DEMO_MODE}`);
      await this.createOrUpdateDemoAccount();
      this.logger.warn(`Setting loginRequired=true and registration=false due to ${AppConstants.OVERRIDE_IS_DEMO_MODE}`);
      await this.settingsStore.setLoginRequired(true);
      await this.settingsStore.setRegistrationEnabled(false);
    } else {
      const loginRequired = this.configService.get(AppConstants.OVERRIDE_LOGIN_REQUIRED, null);
      if (loginRequired !== null) {
        this.logger.warn(`Setting login required due to ${AppConstants.OVERRIDE_LOGIN_REQUIRED}`);
        await this.settingsStore.setLoginRequired(loginRequired === "true");
      }

      const registrationEnabled = this.configService.get(AppConstants.OVERRIDE_REGISTRATION_ENABLED, null);
      if (registrationEnabled !== null) {
        this.logger.warn(`Setting registration enabled due to ${AppConstants.OVERRIDE_REGISTRATION_ENABLED}`);
        await this.settingsStore.setRegistrationEnabled(registrationEnabled === "true");
      }
    }

    const overrideJwtSecret = this.configService.get(AppConstants.OVERRIDE_JWT_SECRET, undefined);
    const overrideJwtExpiresIn = this.configService.get(AppConstants.OVERRIDE_JWT_EXPIRES_IN, undefined);
    await this.settingsStore.persistOptionalCredentialSettings(overrideJwtSecret, overrideJwtExpiresIn);

    // const addy = new Adapter();
    // try {
    //   await addy.connect(-1, {
    //     printerURL: "http://localhost",
    //     printerType: OctoprintType,
    //     apiKey: "EE05954F2E7C4C049D5F41609AC04C7B",
    //   });
    // } catch (e) {
    //   console.error("Error setting up adapter connection");
    // }
    const login = {
      printerURL: "http://localhost",
      printerType: OctoprintType,
      apiKey: "EE05954F2E7C4C049D5F41609AC04C7B",
    };
    const opClient = this.octoprintClient;
    class MyWebSocketClient extends WebSocketAdapter {
      client = opClient;
      authenticated = false;

      protected async handleMessage(data: Data): Promise<void> {
        const original = data.toString();
        const message = JSON.parse(original);
        const eventName = Object.keys(message)[0];
        const payload = message[eventName];

        console.log(`RX Msg ${eventName} ${original.substring(0, 140)}...`);

        if (!this.authenticated) {
          const session = await this.client.login(login).then((r) => r.data);
          const username = await this.client.getAdminUserOrDefault(login);
          const sessionCredentials = `${username}:${session.session}`;
          this.authenticated = true;
          await this.sendMessage(
            JSON.stringify({
              auth: sessionCredentials,
            })
          );
        }
      }
    }

    const storage = new InMemoryRecordingStorage();
    const recorder = new MyWebSocketClient({
      mode: "live",
      recordingStorage: storage,
    });
    try {
      await recorder.connect(-1, login);
      console.log("ws state " + recorder.connectionState);
    } catch (e) {
      console.error("Error setting up adapter connection " + e.message);
    }

    // setTimeout(async () => {
    //   await recorder.disconnect();
    //
    //   const recording = storage.getRecordings()[0];
    //   writeFileSync("recording.json", JSON.stringify(recording, null, 2));
    // }, 11000);
    // await sleep(12000);
    //
    // console.warn("Replaying recording");
    //
    // const result = readFileSync("recording.json", "utf-8");
    // const recording: WebsocketRecording = JSON.parse(result);
    //
    // const addy2 = new MyWebSocketClient({
    //   mode: "replay",
    //   recording,
    // });
    // try {
    //   await addy2.connect(-1, {
    //     printerURL: "http://localhost",
    //     printerType: OctoprintType,
    //     apiKey: "EE05954F2E7C4C049D5F41609AC04C7B",
    //   });
    //   console.log("ws state " + addy2.connectionState);
    // } catch (e) {
    //   console.error("Error setting up adapter connection " + e.message);
    // }

    this.logger.log("Clearing upload folder");
    this.multerService.clearUploadsFolder();

    this.logger.log("Loading printer sockets");
    await this.printerAdapterStore.initPrinterSockets();
    this.logger.log("Loading files store");
    await this.printerFilesStore.loadFilesStore();
    this.logger.log("Loading floor store");
    await this.floorStore.loadStore();
    this.logger.log("Loading printer thumbnail cache");
    await this.printerThumbnailCache.loadCache();
    const length = await this.printerThumbnailCache.getAllValues();
    this.logger.log(`Loaded ${length.length} thumbnail(s)`);

    if (process.env.SAFEMODE_ENABLED === "true") {
      this.logger.warn("Starting in safe mode due to SAFEMODE_ENABLED");
    } else {
      this.serverTasks.BOOT_TASKS.forEach((task) => {
        this.taskManagerService.registerJobOrTask(task);
      });
    }

    // Success so we disable this task
    this.taskManagerService.disableJob(DITokens.bootTask, false);
  }

  async createOrUpdateDemoAccount() {
    const demoUsername = this.configService.get(AppConstants.OVERRIDE_DEMO_USERNAME, AppConstants.DEFAULT_DEMO_USERNAME);
    const demoPassword = this.configService.get(AppConstants.OVERRIDE_DEMO_PASSWORD, AppConstants.DEFAULT_DEMO_PASSWORD);
    const demoRole = this.configService.get(AppConstants.OVERRIDE_DEMO_ROLE, AppConstants.DEFAULT_DEMO_ROLE);
    const adminRole = this.roleService.getRoleByName(demoRole);

    const demoUserId = await this.userService.getDemoUserId();
    if (!demoUserId) {
      await this.userService.register({
        username: demoUsername,
        password: demoPassword,
        isDemoUser: true,
        isVerified: true,
        isRootUser: false,
        needsPasswordChange: false,
        roles: [adminRole.id],
      });
      this.logger.log("Created demo account");
    } else {
      await this.userService.setVerifiedById(demoUserId, true);
      await this.userService.setIsRootUserById(demoUserId, false);
      await this.userService.updatePasswordUnsafeByUsername(demoUsername, demoPassword);
      await this.userService.setUserRoleIds(demoUserId, [adminRole.id]);
      this.logger.log("Updated demo account");
    }
  }

  async createConnection() {
    if (!this.isTypeormMode) {
      const envUrl = fetchMongoDBConnectionString();
      await connect(envUrl, {
        serverSelectionTimeoutMS: 1500,
      });
      await syncIndexes();
    }
  }

  async migrateDatabase() {
    if (!this.isTypeormMode) {
      await runMigrations(mongoose.connection.db, mongoose.connection.getClient());
    }
  }
}
