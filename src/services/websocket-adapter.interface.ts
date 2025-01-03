import { IdType } from "@/shared.constants";
import { LoginDto } from "@/services/interfaces/login.dto";

export interface IWebsocketAdapter<T = IdType> {
  printerType: number;
  printerId?: T;

  connect(printerId: T, loginDto: LoginDto): Promise<void>;

  reconnect(): Promise<void>;

  disconnect(): Promise<void>;

  allowEmittingEvents(): void;

  disallowEmittingEvents(): void;
}
