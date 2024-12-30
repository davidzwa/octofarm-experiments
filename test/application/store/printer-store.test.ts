import { validNewPrinterState } from "../test-data/printer.data";
import { PrinterService } from "@/services/orm/printer.service";
import { PrinterCache } from "@/state/printer.cache";
import { PrinterFilesStore } from "@/state/printer-files.store";
jest.mock("@/services/octoprint/octoprint.client");
import { DITokens } from "@/container.tokens";
import { configureContainer } from "@/container";
import { ValidationException } from "@/exceptions/runtime.exceptions";
import { TestPrinterAdapterStore } from "@/state/test-printer-adapter.store";
import { PrinterAdapterStore } from "@/state/printer-adapter.store";
import { TypeormService } from "@/services/typeorm/typeorm.service";

let printerService: PrinterService;
let printerCache: PrinterCache;
let testprinterAdapterStore: TestPrinterAdapterStore;
let printerFilesStore: PrinterFilesStore;

beforeAll(async () => {
  const container = configureContainer(true);
  expect(container.resolve(DITokens.isTypeormMode)).toBe(true);
  await container.resolve<TypeormService>(DITokens.typeormService).createConnection();
  await container.resolve(DITokens.settingsStore).loadSettings();
  testPrinterSocketStore = container.resolve(DITokens.testPrinterAdapterStore);
  printerCache = container.resolve(DITokens.printerCache);
  printerService = container.resolve(DITokens.printerService);
  printerFilesStore = container.resolve(DITokens.printerFilesStore);
  await printerCache.loadCache();
});

describe(PrinterAdapterStore.name, () => {
  const invalidNewPrinterState = {
    apiKey: "asd",
    printerURL: null as null | string,
  };

  const weakNewPrinter = {
    apiKey: "asdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasd",
    printerURL: "http://192.168.1.0",
  };

  const weakNewPrinter2 = {
    apiKey: "1C0KVOKWEAKWEAK8VBGAR",
    printerURL: "http://192.168.1.0",
  };

  it("should avoid adding invalid printer", async () => {
    await expect(async () => await printerService.create({})).rejects.toBeInstanceOf(ValidationException);

    expect(() => printerService.create(invalidNewPrinterState)).rejects.toHaveErrors({
      apiKey: {
        rule: "length",
      },
    });

    await expect(async () => await printerService.create(weakNewPrinter)).rejects.toBeInstanceOf(ValidationException);

    await expect(async () => await printerService.create(weakNewPrinter2)).rejects.toBeDefined();
  });

  it("should be able to add and flatten new printer", async () => {
    let frozenObject = await printerService.create(validNewPrinterState);
    const printerDto = printerCache.getCachedPrinterOrThrowAsync(frozenObject.id);
    expect(printerDto).toBeTruthy();
  });

  it("should be able to add printer - receiving an object back", async () => {
    let printerEntity = await printerService.create(validNewPrinterState);
    expect(printerEntity).toBeTruthy();

    // Need the store in order to have files to refer to
    await printerFilesStore.loadFilesStore();

    const printerDto = await printerCache.getCachedPrinterOrThrowAsync(printerEntity.id);
    expect(printerDto).toMatchObject({
      id: expect.anything(),
    });
  });

  it("should load cache with a saved printer", async () => {
    await printerService.create(validNewPrinterState);
    await printerCache.loadCache();

    expect((await printerCache.listCachedPrinters()).length).toBeGreaterThan(0);
  });

  it("should get undefined test printer from store", async () => {
    expect(testPrinterSocketStore.testSocket).toBeUndefined();
  });
});
