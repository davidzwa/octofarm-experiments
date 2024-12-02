import { IdDto } from "@/shared.constants";
import { PrinterType } from "@/services/printer-api.interface";

export class PrinterDto<KeyType> extends IdDto<KeyType> {
  name: string;
  enabled: boolean;
  disabledReason: string;
  dateAdded: number;
}

export class PrinterUnsafeDto<KeyType> extends PrinterDto<KeyType> {
  apiKey: string;
  printerURL: string;
  printerType: PrinterType;
}
