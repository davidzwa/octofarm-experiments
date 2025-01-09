import { WebSocket, ClientOptions } from "ws";
import { EventEmitter } from "events";
import { WebSocketEventType, RecordedEvent, WebsocketRecording, WebSocketState } from "./websocket.recording";
import { RecordingStorage } from "@/services/redesign/3-claude-srp/record-replay/recording.storage";

export class RecordingWebSocket extends EventEmitter {
  private recording: WebsocketRecording;
  private socket: WebSocket;
  private currentState: WebSocketState;
  private isSaved: boolean = false;

  constructor(url: string | URL, private storage: RecordingStorage, options?: ClientOptions) {
    super();
    this.socket = new WebSocket(url, options);
    this.currentState = WebSocketState.CONNECTING;
    this.recording = {
      startTime: Date.now(),
      events: [],
      metadata: {
        url: url.toString(),
        totalEvents: 0,
        duration: 0,
      },
    };

    this.setupRecording();
  }

  private async saveRecording() {
    if (this.isSaved) return;

    // Update metadata
    this.recording.metadata = {
      ...this.recording.metadata,
      totalEvents: this.recording.events.length,
      duration: Date.now() - this.recording.startTime,
    };

    await this.storage.saveRecording(this.recording);
    this.isSaved = true;
  }

  get readyState(): number {
    return this.currentState;
  }

  private recordEvent(type: WebSocketEventType, data?: any) {
    const event: RecordedEvent = {
      type,
      timestamp: Date.now(),
      data,
      state: this.currentState,
    };
    this.recording.events.push(event);
    return event;
  }

  private recordStateChange(newState: WebSocketState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.recordEvent("stateChange", { state: newState });
    }
  }

  private setupRecording() {
    // Record initial CONNECTING state
    this.recordStateChange(WebSocketState.CONNECTING);

    this.socket.on("open", () => {
      this.recordStateChange(WebSocketState.OPEN);
      this.recordEvent("open");
      this.emit("open");
    });

    this.socket.on("message", (data) => {
      this.recordEvent("message", data?.toString());
      this.emit("message", data);
    });

    this.socket.on("close", async (code, reason) => {
      this.recordStateChange(WebSocketState.CLOSED);
      this.recordEvent("close", { code, reason });
      this.emit("close", code, reason);

      // Save recording when connection closes
      await this.saveRecording();
    });

    this.socket.on("error", async (error) => {
      this.recordEvent("error", error);
      this.emit("error", error);

      await this.saveRecording();
    });

    this.socket.on("ping", (data) => {
      this.recordEvent("ping", data?.toString());
      this.emit("ping", data);
    });

    this.socket.on("pong", (data) => {
      this.recordEvent("pong", data?.toString());
      this.emit("pong", data);
    });

    // Handle process termination
    process.on("beforeExit", async () => {
      await this.saveRecording();
    });
  }

  send(data: any, callback?: (err?: Error) => void): void {
    this.socket.send(data, callback);
  }

  close(code?: number, reason?: string): void {
    this.recordStateChange(WebSocketState.CLOSING);
    this.socket.close(code, reason);
  }

  ping(data?: any, mask?: boolean, callback?: (err?: Error) => void): void {
    this.socket.ping(data, mask, callback);
  }

  pong(data?: any, mask?: boolean, callback?: (err?: Error) => void): void {
    this.socket.pong(data, mask, callback);
  }

  terminate(): void {
    this.socket.terminate();
  }

  getRecording(): WebsocketRecording {
    return {
      ...this.recording,
      metadata: {
        url: this.socket.url,
        duration: Date.now() - this.recording.startTime,
        totalEvents: this.recording.events.length,
      },
    };
  }
}
