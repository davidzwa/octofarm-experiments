import { AppConstants } from "@/server.constants";
import { CloseEvent, Data, WebSocket, Event as WsEvent, ErrorEvent, MessageEvent } from "ws";
import { LoggerService } from "@/handlers/logger";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { IConfigService } from "@/services/core/config.service";

export type WsProtocol = "ws" | "wss";

export class WebsocketAdapter {
  socket?: WebSocket;
  protected logger: LoggerService;
  protected configService: IConfigService;
  eventEmittingAllowed: boolean = true;

  constructor({ loggerFactory, configService }: { loggerFactory: ILoggerFactory; configService: IConfigService }) {
    this.logger = loggerFactory(WebsocketAdapter.name);
    this.configService = configService;
  }

  get isOpened() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public close() {
    this.socket?.close();
    delete this.socket;
  }

  public allowEmittingEvents() {
    this.eventEmittingAllowed = true;
  }

  public disallowEmittingEvents() {
    this.eventEmittingAllowed = false;
  }

  /**
   * @protected
   * Open a WebSocket connection.
   *
   * @param {string|URL} url - The URL to connect to.
   * @returns {void}
   */
  open(url: string | URL): void {
    if (this.socket) {
      throw new Error("Socket already exists, ignoring open request");
    }

    this.socket = new WebSocket(url, { handshakeTimeout: AppConstants.defaultWebsocketHandshakeTimeout });
    this.socket.onopen = (event) => this.onOpen(event);
    this.socket.onerror = (error) => this.onError(error);
    this.socket.onclose = (event) => this.onClose(event);
    this.socket.onmessage = (message) => this.onMessage(message.data);
  }

  /**
   * @protected
   * Send a message through the WebSocket connection.
   *
   * @param {string} payload - The message payload to send.
   * @returns {Promise<void>} A promise that resolves when the message is sent successfully.
   */
  protected async sendMessage(payload: string): Promise<void> {
    if (!this.isOpened || !this.socket) {
      this.logger.error("Websocket is not opened, cant send a message");
      return;
    }
    return await new Promise((resolve, reject) => {
      this.socket!.send(payload, (error) => {
        if (error) reject(error);
        resolve();
      });
    });
  }

  /**
   * Handle error event.
   * @protected
   * @abstract
   * @param {Event} error - The error event object.
   * @returns {Promise<void> | void} A promise that resolves when the error handling is complete, or void if no promise is returned.
   */
  protected onError(error: ErrorEvent): Promise<void> | void {}

  /**
   * Handle message event.
   * @protected
   * @abstract
   * @param {Data} event - The event object.
   * @returns {Promise<void> | void} A promise that resolves when the message handling is complete, or void if no promise is returned.
   */
  protected onMessage(event: Data): Promise<void> | void {}

  /**
   * Handle open event.
   * @protected
   * @abstract
   * @param {Event} event - The event object.
   * @returns {Promise<void>} A promise that resolves when the open handling is complete.
   */
  protected async onOpen(event: WsEvent): Promise<void> {}

  /**
   * Handle close event.
   * @protected
   * @abstract
   * @param {CloseEvent} event - The event object.
   * @returns {Promise<void>} A promise that resolves when the close handling is complete.
   */
  protected async onClose(event: CloseEvent): Promise<void> {}

  protected get _debugMode() {
    return this.configService.get(AppConstants.debugSocketStatesKey, AppConstants.defaultDebugSocketStates) === "true";
  }
}
