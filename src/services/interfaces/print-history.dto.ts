import { IdType } from "@/shared.constants";

export class CreatePrintHistoryDto<KeyType = IdType> {
  fileName: string;
  status: string;
  printerId: KeyType;
  printerName?: string;
}

export class PrintHistoryDto<KeyType = IdType> {
  id!: KeyType;
  fileName: string;
  createdAt: Date;
  endedAt: Date;
  status: string;
  printerId: KeyType;
  printerName?: string;
}
