import { model, Schema } from "mongoose";
import { PrintCompletionContextDto } from "@/services/interfaces/print-completion-context.dto";

export interface IPrintLog {
  id: string;
  fileName: string;
  createdAt: number;
  status: string;
  printerId: Schema.Types.ObjectId;
  completionLog: string;
  context: PrintCompletionContextDto;
}

const PrintCompletionSchema = new Schema<IPrintLog>({
  fileName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  printerId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  completionLog: {
    type: String,
    required: false,
  },
  context: {
    type: Object,
    required: true,
  },
});

export const PrintCompletion = model("PrintCompletion", PrintCompletionSchema);
