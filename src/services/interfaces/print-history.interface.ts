import { IdType } from "@/shared.constants";
import { CreatePrintHistoryDto, PrintHistoryDto } from "@/services/interfaces/print-history.dto";
import { IPrintLog } from "@/models/PrintCompletion";
import { PrintLog } from "@/entities";

export interface IPrintHistoryService<KeyType = IdType, Entity = IPrintLog> {
  toDto(printCompletion: Entity): PrintHistoryDto<KeyType>;

  create(input: CreatePrintHistoryDto<KeyType>): Promise<Entity>;

  list(): Promise<Entity[]>;

  findPrintLog(correlationId: string): Promise<Entity[]>;

  loadPrintContexts(): Promise<Record<string, (IPrintLog | PrintLog)[]>>;

  listGroupByPrinterStatus(): Promise<any[]>;
}
