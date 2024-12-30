import { PrinterAdapter } from "@/services/redesign/1-state-pattern/printer.adapter";

export enum PrinterStateType {
  Disconnected,
  Connecting,
  Connected,
  Error,
}

export interface PrinterState {
  connect(): void;
  disconnect(): void;
  sendMessage(data: object): void;
}

export class DisconnectedState implements PrinterState {
  constructor(private adapter: PrinterAdapter) {}

  connect(): void {
    console.log("Connecting...");
    this.adapter.changeState(new ConnectingState(this.adapter));
    this.adapter.initiateConnection();
  }

  disconnect(): void {
    console.log("Already disconnected.");
  }

  sendMessage(): void {
    console.error("Cannot send messages while disconnected.");
  }
}

export class ConnectingState implements PrinterState {
  constructor(private adapter: PrinterAdapter) {}

  connect(): void {
    console.log("Already connecting.");
  }

  disconnect(): void {
    console.log("Cancelling connection...");
    this.adapter.changeState(new DisconnectedState(this.adapter));
  }

  sendMessage(): void {
    console.error("Cannot send messages while connecting.");
  }
}

export class ConnectedState implements PrinterState {
  constructor(private adapter: PrinterAdapter) {}

  connect(): void {
    console.log("Already connected.");
  }

  disconnect(): void {
    console.log("Disconnecting...");
    this.adapter.changeState(new DisconnectedState(this.adapter));
    this.adapter.closeConnection();
  }

  sendMessage(data: object): void {
    console.log("Sending message:", data);
    this.adapter.websocket.send(JSON.stringify(data));
  }
}
