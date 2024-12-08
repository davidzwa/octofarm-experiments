import { DITokens } from "@/container.tokens";
import { PrintHistoryService } from "@/services/orm/print-history.service";
import { EVENT_TYPES } from "@/services/octoprint/constants/octoprint-websocket.constants";
import { setupTestApp } from "../test-server";
import { AwilixContainer } from "awilix";
import { generateCorrelationToken } from "@/utils/correlation-token.util";
import { createTestPrinter } from "../api/test-data/create-printer";
import supertest from "supertest";
import { IPrintHistoryService } from "@/services/interfaces/print-history.interface";
import { SqliteIdType } from "@/shared.constants";
import { PrintLog } from "@/entities";

let container: AwilixContainer;
let printCompletionService: IPrintHistoryService<SqliteIdType, PrintLog>;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  ({ container, request } = await setupTestApp(true));
  printCompletionService = container.resolve(DITokens.printCompletionService);
});

describe(PrintHistoryService.name, () => {
  /**
   * Tests that a valid completion can be created through the service without throwing any errors.
   */
  it("can add a print failure with or without log", async () => {
    const trackingToken = generateCorrelationToken();
    const printer = await createTestPrinter(request);
    const completionEntry = await printCompletionService.create({
      printerId: printer.id,
      completionLog: "some log happened here",
      status: EVENT_TYPES.PrintStarted,
      fileName: "mycode.gcode",
      correlationId: trackingToken,
      context: {},
    });
    expect(completionEntry.id).toBeTruthy();

    const completionEntryWithoutLog = await printCompletionService.create({
      printerId: printer.id,
      status: EVENT_TYPES.PrintFailed,
      fileName: "mycode.gcode",
      correlationId: trackingToken,
      context: {},
    });
    expect(completionEntryWithoutLog.id).toBeTruthy();
  });
});
