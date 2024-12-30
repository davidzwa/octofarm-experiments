import { asClass, asValue, AwilixContainer } from "awilix";
import { DITokens } from "@/container.tokens";
import { setupServer } from "@/server.core";
import { setupEnvConfig } from "@/server.env";
import { ROLES } from "@/constants/authorization.constants";
import supertest, { Test } from "supertest";
import { Express } from "express";
import { AppConstants } from "@/server.constants";
import { TypeormService } from "@/services/typeorm/typeorm.service";
import { TaskManagerService } from "@/services/core/task-manager.service";
import { AxiosInstance } from "axios";
import TestAgent from "supertest/lib/agent";
import { SettingsStore } from "@/state/settings.store";

jest.mock("../src/utils/env.utils", () => ({
  ...jest.requireActual("../src/utils/env.utils"),
  writeVariableToEnvFile: jest.fn(),
}));
require("../src/utils/env.utils");

export async function setupTestApp(
  loadPrinterStore = false,
  mocks: any = undefined,
  quick_boot = true
): Promise<{
  container: AwilixContainer;
  httpServer: Express;
  httpClient: AxiosInstance;
  request: TestAgent<Test>;
  typeormService: TypeormService;
  [k: string]: any;
}> {
  setupEnvConfig(true);

  const { httpServer, container } = await setupServer();
  container.register({
    [DITokens.appDefaultRole]: asValue(ROLES.ADMIN),
    [DITokens.appDefaultRoleNoLogin]: asValue(ROLES.ADMIN),
  });

  // Overrides get last pick
  if (mocks) container.register(mocks);

  const isTypeormMode = container.resolve(DITokens.isTypeormMode);
  if (isTypeormMode) {
    // Setup sqlite database in memory - needed for loading settings etc
    const typeormService = container.resolve<TypeormService>(DITokens.typeormService);
    await typeormService.createConnection();
  }

  // Setup
  const settingsStore = container.resolve(DITokens.settingsStore) as SettingsStore;
  await settingsStore.loadSettings();
  await settingsStore.setExperimentalMoonrakerSupport(true);

  const serverHost = container.resolve(DITokens.serverHost);
  await serverHost.boot(httpServer, quick_boot, false);

  await settingsStore.setWizardCompleted(AppConstants.currentWizardVersion);
  await settingsStore.setLoginRequired(false);
  await container.resolve(DITokens.permissionService).syncPermissions();
  await container.resolve(DITokens.roleService).syncRoles();

  if (loadPrinterStore) {
    // Requires (in-memory) database connection, so its optional
    const printerSocketStore = container.resolve(DITokens.printerAdapterStore);
    await printerSocketStore.loadPrinterSockets();
  }

  return {
    idType: isTypeormMode ? Number : String,
    isTypeormMode,
    httpServer,
    request: supertest(httpServer),
    container,
    httpClient: container.resolve<AxiosInstance>(DITokens.httpClient),
    [DITokens.taskManagerService]: container.resolve<TaskManagerService>(DITokens.taskManagerService),
    [DITokens.typeormService]: container.resolve<TypeormService>(DITokens.typeormService),
  };
}
