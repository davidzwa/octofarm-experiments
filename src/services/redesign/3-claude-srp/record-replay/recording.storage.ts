import { createWriteStream } from "node:fs";
import path from "path";
import { WebsocketRecording } from "@/services/redesign/3-claude-srp/record-replay/websocket.recording";
import { createHash } from "node:crypto";

export interface RecordingStorage {
  saveRecording(recording: WebsocketRecording): Promise<void>;
}

// export class FileRecordingStorage implements RecordingStorage {
//   constructor(private basePath: string) {}
//
//   async saveRecording(recording: WebsocketRecording): Promise<void> {
//     // Generate unique filename based on timestamp and some connection details
//     const filename = `${recording.startTime}-${hashString(recording.metadata?.url || "unknown")}.wsrec`;
//     const filepath = path.join(this.basePath, filename);
//
//     const writer = new RecordingWriter({ url: recording.metadata?.url || "unknown" });
//     const fileStream = createWriteStream(filepath);
//
//     writer.pipe(fileStream);
//
//     // Write all existing events
//     for (const event of recording.events) {
//       writer.write(event);
//     }
//
//     await new Promise<void>((resolve, reject) => {
//       writer.end((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//   }
// }

function hashString(str: string): string {
  return createHash("md5").update(str).digest("hex").slice(0, 8);
}

export class InMemoryRecordingStorage implements RecordingStorage {
  private recordings: WebsocketRecording[] = [];

  async saveRecording(recording: WebsocketRecording): Promise<void> {
    this.recordings.push(recording);
  }

  getRecordings(): WebsocketRecording[] {
    return this.recordings;
  }
}
