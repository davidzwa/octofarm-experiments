import { WebSocket } from "ws";
import { WebSocketFactory, WebSocketFactoryConfig } from "@/services/redesign/3-claude-srp/record-replay/websocket.factory";

export interface ConnectionConfig {
  url: URL;
  handshakeTimeout: number;
  reconnectInterval: number;
}

export class ConnectionManager {
  private reconnectInterval?: NodeJS.Timeout;
  private isReconnecting: boolean = false;

  private webSocketFactory: WebSocketFactory;

  constructor(
    private readonly config: ConnectionConfig,
    private readonly factoryConfig: WebSocketFactoryConfig,
    private readonly onSocketCreated: (socket: WebSocket) => void
  ) {
    this.webSocketFactory = new WebSocketFactory(this.factoryConfig);
  }

  async connect(): Promise<void> {
    // Initial connection attempt that transitions to reconnect on failure
    try {
      const socket = await this.openWebSocketWithTimeout();
      this.onSocketCreated(socket);
    } catch (error) {
      console.error("Initial connection failed, scheduling reconnect");
      this.reconnect();
    }
  }

  reconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    this.reconnectInterval = setInterval(async () => {
      try {
        console.warn("Starting reconnect logic");
        const socket = await this.openWebSocketWithTimeout();
        this.onSocketCreated(socket);
        this.clearReconnect();
        console.warn("Reconnection successful");
      } catch (err) {
        console.error("Reconnection failed, retrying...");
      }
    }, this.config.reconnectInterval);
  }

  clearReconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = undefined;
    }
    this.isReconnecting = false;
  }

  private async openWebSocketWithTimeout(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const socket = this.webSocketFactory.create(this.config.url, {
        handshakeTimeout: this.config.handshakeTimeout,
      });

      const timer = setTimeout(() => {
        socket.terminate();
        reject(new Error(`Connection timed out after ${this.config.handshakeTimeout}ms`));
      }, this.config.handshakeTimeout);

      socket.once("open", () => {
        clearTimeout(timer);
        resolve(socket);
      });

      socket.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      socket.once("close", (event) => {
        clearTimeout(timer);
        reject(event);
      });
    });
  }
}
