export type WebSocketEventType = "open" | "close" | "message" | "error" | "ping" | "pong" | "stateChange"; // New event type for state changes

export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export interface RecordedEvent {
  type: WebSocketEventType;
  timestamp: number;
  data?: any;
  code?: number;
  reason?: string;
  error?: any;
  state?: WebSocketState; // New field for state changes
}

export interface WebsocketRecording {
  startTime: number;
  events: RecordedEvent[];
  metadata?: {
    url: string;
    duration: number;
    totalEvents: number;
  };
}
