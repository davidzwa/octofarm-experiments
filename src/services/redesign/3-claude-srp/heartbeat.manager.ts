import { WebSocket } from "ws";

export interface HeartbeatConfig {
  pingIntervalMs: number;
  pongTimeoutMs: number;
}

export class HeartbeatManager {
  private heartbeatInterval?: NodeJS.Timeout;
  private pingTimeout?: NodeJS.Timeout;
  private lastPingNumber: number = 0;

  constructor(
    private readonly socket: WebSocket,
    private readonly config: HeartbeatConfig,
    private readonly onHeartbeatFailed: () => void
  ) {}

  start(): void {
    if (this.heartbeatInterval) {
      throw new Error("Heartbeat already running");
    }

    this.heartbeatInterval = setInterval(() => this.ping(), this.config.pingIntervalMs);
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = undefined;
    }
  }

  handlePong(data: Buffer): void {
    const message = data.toString();
    if (!message.startsWith("ping:")) {
      console.error("Unrecognizable pong message");
      return;
    }

    const pongNumber = parseInt(message.split(":")[1], 10);
    if (isNaN(pongNumber)) {
      console.error("Invalid pong number:", message);
      return;
    }

    if (pongNumber !== this.lastPingNumber) {
      console.error(`Pong mismatch: expected ${this.lastPingNumber}, got ${pongNumber}`);
      return;
    }

    clearTimeout(this.pingTimeout);
  }

  private ping(): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Socket not open");
    }

    this.lastPingNumber = ++this.lastPingNumber % 1_000_000;
    const pingMessage = `ping:${this.lastPingNumber}`;
    this.socket.ping(pingMessage);

    this.pingTimeout = setTimeout(() => {
      console.error("Heartbeat failed due to timeout, triggering alert");
      this.onHeartbeatFailed();
    }, this.config.pongTimeoutMs);
  }
}
