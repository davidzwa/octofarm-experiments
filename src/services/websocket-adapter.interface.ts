import { IdType } from "@/shared.constants";
import { ISocketLogin } from "@/shared/dtos/socket-login.dto";
import { SocketState } from "@/shared/dtos/socket-state.type";
import { ApiState } from "@/shared/dtos/api-state.type";

export interface IWebsocketAdapter<T = IdType> {
  printerType: number;
  printerId?: T;
  socketState: SocketState;
  apiState: ApiState;

  registerCredentials(socketLogin: ISocketLogin): void;

  initSession(): Promise<void>;

  // Reload or schedule reload
  // reconnect(): Promise<void>;

  reauthSession(): void;

  open(): void;

  close(): void;

  resetSocketState(): void;

  allowEmittingEvents(): void;

  disallowEmittingEvents(): void;
}
