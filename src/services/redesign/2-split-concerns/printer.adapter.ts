class PrinterAdapter {
  constructor(
    private connectionHandler: ConnectionHandler,
    private stateManager: StateManager,
    private eventEmitter: PrinterEventEmitter
  ) {}

  connect(): void {
    this.stateManager.transitionTo(StateType.Connecting);
    this.connectionHandler.connect();
  }

  disconnect(): void {
    this.connectionHandler.disconnect();
    this.stateManager.transitionTo(StateType.Disconnected);
  }

  sendMessage(data: object): void {
    this.connectionHandler.sendMessage(data);
  }
}
