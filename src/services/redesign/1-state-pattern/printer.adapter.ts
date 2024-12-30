import { ConnectedState, DisconnectedState, PrinterState } from "@/services/redesign/1-state-pattern/state";

export class PrinterAdapter {
  private state: PrinterState = new DisconnectedState(this);
  url: string = "http://localhost:8080";
  websocket!: WebSocket;

  connect(): void {
    this.state.connect();
  }

  disconnect(): void {
    this.state.disconnect();
  }

  sendMessage(data: object): void {
    this.state.sendMessage(data);
  }

  changeState(newState: PrinterState): void {
    this.state = newState;
    console.log(`State changed to: ${newState.constructor.name}`);
  }

  initiateConnection(): void {
    this.websocket = new WebSocket(this.url);
    this.websocket.onopen = () => this.changeState(new ConnectedState(this));
    this.websocket.onclose = () => this.changeState(new DisconnectedState(this));
    this.websocket.onerror = () => this.changeState(new DisconnectedState(this));
  }

  closeConnection(): void {
    if (this.websocket) this.websocket.close();
  }
}
