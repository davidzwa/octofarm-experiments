import { IdType } from "@/shared.constants";
import { LoginDto } from "@/services/interfaces/login.dto";
import { urlToWs } from "@/services/octoprint/utils/ws.utils";
import { AppConstants } from "@/server.constants";
import { CloseEvent, Data, Event as WsEvent, WebSocket } from "ws";

export class Adapter<T = IdType> {
  public printerId?: T;
  private url?: URL;
  private socket?: WebSocket;

  private heartbeatInterval?: NodeJS.Timeout;
  private pingTimeout?: NodeJS.Timeout; // Tracks pong timeout
  private lastPingNumber: number = 0; // Incremental counter for ping

  private reconnectInterval?: NodeJS.Timeout;
  private isReconnecting: boolean = false;

  public async connect(id: T, loginDto: LoginDto): Promise<void> {
    this.printerId = id;

    const url = urlToWs(loginDto.printerURL);

    await this.open(url);
  }

  public async disconnect(): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket already exists, ignoring open request");
    }

    await this.closeWebSocketWithTimeout();
  }

  private async open(url: URL): Promise<void> {
    if (this.socket) {
      throw new Error("Socket already exists, ignoring open request");
    }

    this.socket = await this.openWebSocketWithTimeout(url, AppConstants.defaultWebsocketHandshakeTimeout);

    this.socket.onopen = (event) => this.onOpen(event);
    this.socket.on("ping", (data) => this.onPing(data));
    this.socket.on("pong", (data) => this.onPong(data));
    this.socket.onclose = (closeEvent) => this.onClose(closeEvent);
    this.socket.onerror = (errorEvent) => this.onError(errorEvent);
    this.socket.onmessage = (message) => this.onMessage(message.data);
  }

  private async reconnectWebSocketWithInterval(): Promise<void> {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    this.reconnectInterval = setInterval(async () => {
      if (this.heartbeatInterval || this.pingTimeout) {
        console.error("Reconnect loop detected active heartbeat or pingTimeout");
      }

      this.lastPingNumber = 0;

      try {
        await this.open(this.url);
        clearInterval(this.reconnectInterval);
        this.isReconnecting = false;
        console.warn("Reconnection successful");
      } catch (err) {
        console.error("Reconnection failed, retrying in 5 seconds");
      }
    }, 5000);
  }

  private async openWebSocketWithTimeout(url: URL, timeout: number): Promise<WebSocket> {
    if (this.socket) {
      throw new Error("Socket already exists, ignoring open request");
    }

    return new Promise((resolve, reject) => {
      this.url = url;
      this.socket = new WebSocket(this.url, { handshakeTimeout: timeout });

      const timer = setTimeout(() => {
        this.socket.terminate();
        reject(new Error(`WebSocket connection timed out after ${timeout}ms`));
      }, timeout);

      this.socket.onopen = (event) => {
        clearTimeout(timer);
        this.onOpen(event);
        resolve(this.socket);
      };

      this.socket.onerror = (errorEvent) => {
        clearTimeout(timer);
        this.onError(errorEvent);
        reject(errorEvent);
      };

      this.socket.onclose = (closeEvent) => {
        clearTimeout(timer);
        this.onClose(closeEvent);
        reject(closeEvent);
      };
    });
  }

  private async closeWebSocketWithTimeout(): Promise<void> {
    if (!this.socket) {
      throw new Error("Cannot close websocket, no socket was opened");
    }

    return new Promise<void>((resolve, reject) => {
      let isClosed = false;

      const timeout = setTimeout(() => {
        if (!isClosed) {
          this.socket?.terminate();
          this.socket = undefined;
          console.error("WebSocket close timed out, connection terminated");
          reject(new Error("WebSocket close timed out"));
        }
      }, 1000);

      this.socket.onclose = () => {
        console.error("WebSocket close fired");
        clearTimeout(timeout);
        isClosed = true;
        resolve();
      };

      this.socket.close();
      this.socket = undefined;
    });
  }

  protected async onOpen(event: WsEvent): Promise<void> {
    console.error("Subclass socket open");
    this.startHeartbeat();
  }

  protected async onError(error: WsEvent): Promise<void> {
    console.error("Socket error, initiating reconnect");

    this.stopHeartbeat();

    if (this.socket) {
      await this.closeWebSocketWithTimeout();
    }
    await this.reconnectWebSocketWithInterval();
  }

  protected async onClose(closeEvent: CloseEvent): Promise<void> {
    console.error("Socket closed, initiating reconnect");

    this.stopHeartbeat();

    if (this.socket) {
      await this.closeWebSocketWithTimeout();
    }
    await this.reconnectWebSocketWithInterval();
  }

  protected async onMessage(data: Data): Promise<void> {
    console.warn("Subclass socket message received");
  }

  protected async onPing(data: Data): Promise<void> {
    console.error("Subclass socket received ping");
    this.socket.pong(data);
  }

  protected async onPong(data: Data): Promise<void> {
    const message = data.toString();
    if (message.startsWith("ping:")) {
      const pongNumber = parseInt(message.split(":")[1], 10);

      if (isNaN(pongNumber)) {
        console.error("Invalid pong received:", message);
        return;
      }

      if (pongNumber !== this.lastPingNumber) {
        console.error(`Pong mismatch: expected ${this.lastPingNumber}, got ${pongNumber}`);
      } else {
        // Pong received, clear timeout to avoid closing socket
        clearTimeout(this.pingTimeout);
      }
    } else {
      console.error("Pong received but message unrecognizable");
    }
  }

  protected async sendMessage(payload: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Websocket was not created, cant send a message");
    }

    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Websocket has not been opened yet, cant send a message");
    }

    return await new Promise((resolve, reject) => {
      this.socket!.send(payload, (error) => {
        if (error) reject(error);
        resolve();
      });
    });
  }

  private startHeartbeat(): void {
    if (!this.socket) {
      throw new Error("Websocket was not created, cant start heartbeat loop");
    }

    if (this.heartbeatInterval) {
      throw new Error("Cant start new heartbeat, stop previous one first");
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.socket) {
        throw new Error("Websocket was not created, cant send a message");
      }

      if (this.socket?.readyState !== WebSocket.OPEN) {
        throw new Error("Websocket has not been opened yet, cant send a message");
      }

      this.lastPingNumber = ++this.lastPingNumber % 1_000_000;
      const pingMessage = `ping:${this.lastPingNumber}`;
      this.socket.ping(pingMessage);

      // Set a timeout to close the socket if pong is not received
      this.pingTimeout = setTimeout(() => {
        console.error("Pong timeout, closing socket");
        this.socket?.close();
      }, 5000); // Wait 5 seconds for pong
    }, 7500); // Send "ping" every 15 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = undefined;
    }
  }
}
