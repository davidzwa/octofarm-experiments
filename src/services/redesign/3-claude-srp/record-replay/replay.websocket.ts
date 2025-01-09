import { EventEmitter } from "events";
import { WebsocketRecording, RecordedEvent, WebSocketState } from "./websocket.recording";

export class ReplayWebSocket extends EventEmitter {
  private timers: NodeJS.Timeout[] = [];
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private currentState: WebSocketState = WebSocketState.CONNECTING;

  get readyState() {
    return this.currentState;
  }

  constructor(private recording: WebsocketRecording) {
    super();

    this.connect();
  }

  connect(): void {
    if (this.isPlaying) {
      throw new Error("Already playing recording");
    }

    this.isPlaying = true;
    this.startTime = Date.now();
    this.currentState = WebSocketState.CONNECTING;
    this.scheduleEvents();

    // Immediate open event
    this.emit("open");
  }

  private scheduleEvents(): void {
    this.recording.events.forEach((event) => {
      const delay = event.timestamp - this.recording.startTime;
      const timer = setTimeout(() => {
        this.playEvent(event);
      }, delay);
      this.timers.push(timer);
    });
  }

  private playEvent(event: RecordedEvent): void {
    // Update state if recorded
    if (event.state !== undefined && event.state !== this.currentState) {
      this.currentState = event.state;
    }

    switch (event.type) {
      case "stateChange":
        this.currentState = event.data.state;
        break;
      case "open":
        this.emit("open");
        break;
      case "message":
        this.emit("message", event.data);
        break;
      case "close":
        this.emit("close", event.code, event.reason);
        break;
      case "error":
        this.emit("error", event.error);
        break;
      case "ping":
        this.emit("ping", event.data);
        break;
      case "pong":
        this.emit("pong", event.data);
        break;
    }
  }

  send(data: any, callback?: (err?: Error) => void): void {
    // In replay mode, we just acknowledge the send
    if (callback) callback();
  }

  close(): void {
    this.cleanup();
  }

  ping(data?: any, mask?: boolean, callback?: (err?: Error) => void): void {
    if (callback) callback();
  }

  pong(data?: any, mask?: boolean, callback?: (err?: Error) => void): void {
    if (callback) callback();
  }

  terminate(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.isPlaying = false;
  }
}
