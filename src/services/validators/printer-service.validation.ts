import { apiKeyLengthMaxDefault, apiKeyLengthMinDefault } from "@/constants/service.constants";
import { OctoprintType, MoonrakerType, BambuType } from "@/services/printer-api.interface";

export const createMongoPrinterRules = {
  _id: "not",
  printerURL: "required|httpurl",
  printerType: `required|integer|in:${OctoprintType},${MoonrakerType},${BambuType}`,
  apiKey: `requiredIf:printerType,${OctoprintType}|length:${apiKeyLengthMaxDefault},${apiKeyLengthMinDefault}|alphaDash`,
  enabled: "boolean",
  name: "string",
};

export const createPrinterRules = {
  printerURL: "required|httpurl",
  printerType: `required|integer|in:${OctoprintType},${MoonrakerType},${BambuType}`,
  apiKey: `requiredIf:printerType,${OctoprintType}|length:${apiKeyLengthMaxDefault},${apiKeyLengthMinDefault}|alphaDash`,
  enabled: "boolean",
  name: "required|string",
};

export const updatePrinterEnabledRule = {
  enabled: "required|boolean",
};

export const updatePrinterDisabledReasonRule = {
  disabledReason: "required|nullable|string",
  enabled: "boolean",
};
