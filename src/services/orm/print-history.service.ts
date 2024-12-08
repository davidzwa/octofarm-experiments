import { BaseService } from "@/services/orm/base.service";
import { PrintLog } from "@/entities";
import { CreatePrintHistoryDto, PrintHistoryDto } from "@/services/interfaces/print-history.dto";
import { SqliteIdType } from "@/shared.constants";
import { IPrintHistoryService } from "@/services/interfaces/print-history.interface";
import { In, Not } from "typeorm";
import { EVENT_TYPES } from "@/services/octoprint/constants/octoprint-websocket.constants";
import { groupArrayBy } from "@/utils/array.util";
import { TypeormService } from "@/services/typeorm/typeorm.service";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { LoggerService } from "@/handlers/logger";
import { AnalyzedCompletions, processCompletions } from "@/services/mongoose/print-completion.shared";

export class PrintHistoryService
  extends BaseService(PrintLog, PrintHistoryDto<SqliteIdType>)
  implements IPrintHistoryService<SqliteIdType, PrintLog>
{
  logger: LoggerService;

  constructor({ typeormService, loggerFactory }: { typeormService: TypeormService; loggerFactory: ILoggerFactory }) {
    super({ typeormService });
    this.logger = loggerFactory(PrintHistoryService.name);
  }

  toDto(entity: PrintLog): PrintHistoryDto<SqliteIdType> {
    return {
      id: entity.id,
      fileName: entity.fileName,
      createdAt: entity.createdAt,
      printerName: entity.printerName,
      status: entity.status,
      printerId: entity.printerId,
    };
  }

  async create(input: CreatePrintHistoryDto<SqliteIdType>) {
    return await super.create(input);
  }

  async findPrintLog(correlationId: string) {
    const completions = await this.repository.findBy({});
    return completions.filter((c) => c.context?.correlationId === correlationId);
  }

  async updateContext(correlationId: string, context: PrintCompletionContext): Promise<void> {
    if (!correlationId?.length) {
      this.logger.warn("Ignoring undefined correlationId, cant update print completion context");
      return;
    }

    const completionEntry = await this.repository.findOneBy({
      context: { correlationId },
      status: EVENT_TYPES.PrintStarted,
    });
    if (!completionEntry) {
      this.logger.warn(`Print with correlationId ${correlationId} could not be updated with new context as it was not found`);
      return;
    }
    completionEntry.context = context;
    await this.update(completionEntry.id, completionEntry);
  }

  async listGroupByPrinterStatus(): Promise<AnalyzedCompletions[]> {
    const limitedCompletions = await this.listPaged();
    const printCompletionsAggr = groupArrayBy(limitedCompletions, (val) => val.printerId.toString());
    const completions = Object.entries(printCompletionsAggr).map(([pc, val]) => ({
      printerId: parseInt(pc),
      printEvents: val,
    }));
    return processCompletions(completions);
  }

  async loadPrintContexts(): Promise<Record<string, PrintLog[]>> {
    const completions = await this.repository.find({
      where: {
        status: Not(In([EVENT_TYPES.PrintDone, EVENT_TYPES.PrintFailed])),
      },
      order: {
        printerId: 1,
        createdAt: -1,
      },
    });

    return groupArrayBy(completions, (val) => val.id.toString());
  }
}
