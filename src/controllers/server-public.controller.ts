import { createController } from "awilix-express";
import { AppConstants } from "@/server.constants";
import { isNode } from "@/utils/env.utils";
import { authenticate, authorizePermission } from "@/middleware/authenticate";
import { PERMS } from "@/constants/authorization.constants";
import { isDocker } from "@/utils/is-docker";
import { RoleService } from "@/services/mongoose/role.service";
import { SettingsStore } from "@/state/settings.store";
import { PrinterSocketStore } from "@/state/printer-socket.store";
import { ServerReleaseService } from "@/services/core/server-release.service";
import { MonsterPiService } from "@/services/core/monsterpi.service";
import { UserService } from "@/services/mongoose/user.service";
import { Request, Response } from "express";

export class ServerPublicController {
  serverVersion: string;
  settingsStore: SettingsStore;
  printerSocketStore: PrinterSocketStore;
  serverReleaseService: ServerReleaseService;
  monsterPiService: MonsterPiService;
  userService: UserService;
  roleService: RoleService;
  isTypeormMode: boolean;

  constructor({
    settingsStore,
    printerSocketStore,
    serverVersion,
    serverReleaseService,
    monsterPiService,
    userService,
    roleService,
    isTypeormMode,
  }: {
    settingsStore: SettingsStore;
    printerSocketStore: PrinterSocketStore;
    serverVersion: string;
    serverReleaseService: ServerReleaseService;
    monsterPiService: MonsterPiService;
    userService: UserService;
    roleService: RoleService;
    isTypeormMode: boolean;
  }) {
    this.settingsStore = settingsStore;
    this.serverVersion = serverVersion;
    this.printerSocketStore = printerSocketStore;
    this.serverReleaseService = serverReleaseService;
    this.monsterPiService = monsterPiService;
    this.userService = userService;
    this.roleService = roleService;
    this.isTypeormMode = isTypeormMode;
  }

  welcome(req: Request, res: Response) {
    const serverSettings = this.settingsStore.getSettings();

    if (!this.settingsStore.getLoginRequired()) {
      return res.send({
        message: "Login disabled. Please load the Vue app.",
      });
    }

    return res.send({
      message: "Login required. Please load the Vue app.",
    });
  }

  getFeatures(req: Request, res: Response) {
    const serverSettings = this.settingsStore.getServerSettings();
    const moonrakerEnabled = serverSettings.experimentalMoonrakerSupport;
    const bambuEnabled = serverSettings.experimentalBambuSupport;

    const services = ["octoprint"].concat(moonrakerEnabled ? ["klipper"] : []).concat(bambuEnabled ? ["bambu"] : []);

    res.send({
      batchReprintCalls: {
        available: true,
        // API duplicated at /batch/reprint (deprecated but backwards compatible)
        version: 2,
      },
      batchConnectSocketCalls: {
        available: true,
        version: 1,
      },
      batchConnectUsbCalls: {
        available: true,
        version: 1,
      },
      newSockets: {
        available: true,
        version: 1,
      },
      anonymousDiagnosticsToggle: {
        available: true,
        version: 1,
      },
      pauseResumePrinterCommand: {
        available: true,
        version: 1,
      },
      logDumpZip: {
        available: true,
        version: 1,
      },
      clearLogFiles: {
        available: true,
        version: 1,
      },
      batchTogglePrinterEnabled: {
        available: true,
        version: 1,
      },
      cameraStream: {
        available: true,
        version: 1,
        subFeatures: {},
      },
      printerGroupsApi: {
        // Only SQLite mode supported for this feature
        available: this.isTypeormMode,
        version: 1,
        subFeatures: {},
      },
      printerControlApi: {
        available: true,
        version: 1,
      },
      githubRateLimitApi: {
        available: true,
        version: 1,
      },
      multiplePrinterServices: {
        available: true,
        version: 1,
        subFeatures: {
          types: services,
        },
      },
    });
  }

  async getVersion(req: Request, res: Response) {
    let updateState = this.serverReleaseService.getState();
    const monsterPiVersion = this.monsterPiService.getMonsterPiVersionSafe();

    res.json({
      version: this.serverVersion,
      isDockerContainer: isDocker(),
      isNode: isNode(),
      os: process.env.OS,
      monsterPi: monsterPiVersion,
      update: {
        synced: updateState.synced,
        updateAvailable: updateState.updateAvailable,
        airGapped: updateState.airGapped,
      },
    });
  }

  async test(req: Request, res: Response) {
    res.send({
      message: "Test successful. Please load the Vue app.",
    });
  }
}

export default createController(ServerPublicController)
  .prefix(AppConstants.apiRoute + "/")
  .get("", "welcome", { before: [authenticate(), authorizePermission(PERMS.ServerInfo.Get)] })
  .get("test", "test")
  .get("features", "getFeatures", { before: [authenticate()] })
  .get("version", "getVersion", { before: [authenticate(), authorizePermission(PERMS.ServerInfo.Get)] });
