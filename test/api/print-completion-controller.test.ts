import { AwilixContainer } from "awilix";
import { setupTestApp } from "../test-server";
import { expectOkResponse } from "../extensions";
import { AppConstants } from "@/server.constants";
import { EVENT_TYPES } from "@/services/octoprint/constants/octoprint-websocket.constants";
import { DITokens } from "@/container.tokens";
import { SqliteIdType } from "@/shared.constants";
import { PrintHistoryDto } from "@/services/interfaces/print-history.dto";
import { IPrintHistoryService } from "@/services/interfaces/print-history.interface";
import supertest from "supertest";
import { PrintCompletionController } from "@/controllers/print-completion.controller";
import { createTestPrinter } from "./test-data/create-printer";

let printCompletionService: IPrintHistoryService<SqliteIdType, PrintHistoryDto>;
const listRoute = `${AppConstants.apiRoute}/print-completion`;
const getCompletionEntryRoute = (corrId: string) => `${listRoute}/${corrId}`;
const contextsRoute = `${listRoute}/contexts`;
const testRoute = `${listRoute}/test`;

let request: supertest.SuperTest<supertest.Test>;
let container: AwilixContainer<any>;

beforeAll(async () => {
  ({ request, container } = await setupTestApp(true));
  printCompletionService = container.resolve(DITokens.printCompletionService);
});

describe(PrintCompletionController.name, () => {
  it("should return empty print completion list", async () => {
    const response = await request.get(listRoute).send();
    expectOkResponse(response, []);
  });

  it("should return context list", async () => {
    const response = await request.get(contextsRoute).send();
    expectOkResponse(response, {});
  });

  it("should return test query result", async () => {
    const response = await request.get(testRoute).send();
    expectOkResponse(response, {});
  });

  it("should aggregate created completions", async () => {
    const printer = await createTestPrinter(request, false);
    const completionEntryStart = await printCompletionService.create({
      printerId: printer.id,
      completionLog: "some log happened here",
      status: EVENT_TYPES.PrintStarted,
      fileName: "mycode.gcode",
      context: {
        correlationId: "123",
      },
    });
    expect(completionEntryStart.id).toBeTruthy();
    const completionEntryDone = await printCompletionService.create({
      printerId: printer.id,
      completionLog: "some log happened here",
      status: EVENT_TYPES.PrintDone,
      fileName: "mycode.gcode",
      context: {
        correlationId: "123",
      },
    });
    expect(completionEntryDone.id).toBeTruthy();

    const response = await request.get(listRoute).send();
    const body = expectOkResponse(response);
    expect(body).toHaveLength(1);
    const printEvents = body[0];
    expect(printEvents.printerId).toEqual(printer.id);
    expect(printEvents.eventCount).toEqual(2);
    expect(printEvents.printCount).toEqual(1);
    expect(printEvents.printJobs).toHaveLength(1);
    expect(printEvents.printJobs[0].correlationId).toEqual("123");

    const responseEntries = await request.get(getCompletionEntryRoute("123"));
    const completionEntries = expectOkResponse(responseEntries);
    expect(completionEntries).toHaveLength(2);
  });
});
