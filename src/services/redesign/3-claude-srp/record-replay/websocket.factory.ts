import { ClientOptions, WebSocket } from "ws";
import { RecordingWebSocket } from "./recording.websocket";
import { ReplayWebSocket } from "./replay.websocket";
import { WebsocketRecording } from "./websocket.recording";
import { RecordingStorage } from "@/services/redesign/3-claude-srp/record-replay/recording.storage";

export type WebSocketMode = "live" | "record" | "replay";

export interface WebSocketFactoryConfig {
  mode: WebSocketMode;
  recording?: WebsocketRecording;
  recordingStorage?: RecordingStorage;
}

export class WebSocketFactory {
  constructor(private config: WebSocketFactoryConfig) {}

  create(url: string | URL, options?: ClientOptions): WebSocket {
    switch (this.config.mode) {
      case "live":
        return new WebSocket(url, options);
      case "record":
        return new RecordingWebSocket(url, this.config.recordingStorage, options);
      case "replay":
        if (!this.config.recording) {
          throw new Error("Recording required for replay mode");
        }
        return new ReplayWebSocket(this.config.recording);
      default:
        throw new Error(`Unknown mode: ${this.config.mode}`);
    }
  }
}
