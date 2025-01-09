import { IdType } from "@/shared.constants";
import { LoginDto } from "@/services/interfaces/login.dto";
import { urlToWs } from "@/services/octoprint/utils/ws.utils";
import { AppConstants } from "@/server.constants";
import { WebSocket, Data } from "ws";
import { ConnectionManager } from "./connection.manager";
import { HeartbeatConfig, HeartbeatManager } from "@/services/redesign/3-claude-srp/heartbeat.manager";
import { ConnectionState } from "./connection.state";
import { WebSocketFactoryConfig } from "@/services/redesign/3-claude-srp/record-replay/websocket.factory";

export abstract class WebSocketAdapter<T = IdType> {
  protected printerId?: T;
  protected socket?: WebSocket;
  public connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  private connectionManager?: ConnectionManager;
  private heartbeatManager?: HeartbeatManager;

  constructor(private readonly factoryConfig: WebSocketFactoryConfig) {}

  private readonly heartbeatConfig: HeartbeatConfig = {
    pingIntervalMs: 7500,
    pongTimeoutMs: 5000,
  };

  async connect(id: T, loginDto: LoginDto): Promise<void> {
    this.printerId = id;
    const url = urlToWs(loginDto.printerURL);

    this.connectionManager = new ConnectionManager(
      {
        url,
        handshakeTimeout: AppConstants.defaultWebsocketHandshakeTimeout,
        reconnectInterval: 5000,
      },
      this.factoryConfig,
      (socket) => this.handleNewSocket(socket)
    );

    this.connectionState = ConnectionState.CONNECTING;
    await this.connectionManager.connect();
  }

  async reconnect(id: T, loginDto: LoginDto) {
    try {
      await this.disconnect();
    } catch (error) {}

    return this.connect(id, loginDto);
  }

  async disconnect(): Promise<void> {
    if (!this.socket) return;

    this.heartbeatManager?.stop();
    this.connectionManager?.clearReconnect();

    await this.closeSocketWithTimeout();
    this.connectionState = ConnectionState.DISCONNECTED;
  }

  protected abstract handleMessage(data: Data): Promise<void>;

  private handleNewSocket(socket: WebSocket): void {
    this.socket = socket;
    this.heartbeatManager = new HeartbeatManager(socket, this.heartbeatConfig, () => this.handleDisconnection());

    socket.on("message", (data) => this.handleMessage(data));
    socket.on("ping", (data) => socket.pong(data));
    socket.on("pong", (data) => this.heartbeatManager!.handlePong(data));
    socket.on("error", () => this.handleDisconnection());
    socket.on("close", () => this.handleDisconnection());

    this.connectionState = ConnectionState.CONNECTED;
    this.heartbeatManager.start();
  }

  private async handleDisconnection(): Promise<void> {
    this.heartbeatManager?.stop();
    this.connectionState = ConnectionState.RECONNECTING;

    if (this.socket) {
      try {
        await this.closeSocketWithTimeout();
      } catch (e) {
        console.error("Handle disconnection aborted " + e.message);
      }
    }

    this.connectionManager?.reconnect();
  }

  private async closeSocketWithTimeout(): Promise<void> {
    if (!this.socket) return;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.socket?.terminate();
        this.socket = undefined;
        reject(new Error("Socket close timed out"));
      }, 1000);

      this.socket.once("close", () => {
        clearTimeout(timeout);
        this.socket = undefined;
        resolve();
      });

      this.socket.close();
    });
  }

  protected async sendMessage(payload: string): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Socket not ready for sending messages");
    }

    return new Promise((resolve, reject) => {
      this.socket!.send(payload, (error) => {
        if (error) reject(error);
        resolve();
      });
    });
  }
}
