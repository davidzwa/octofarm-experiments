import { model, Schema } from "mongoose";
import {
  credentialSettingsKey,
  printerFileCleanSettingKey,
  frontendSettingKey,
  serverSettingsKey,
  timeoutSettingKey,
  wizardSettingKey,
} from "@/constants/server-settings.constants";

export interface IWizardSettings {
  wizardCompleted: boolean;
  wizardCompletedAt: Date | null;
  wizardVersion: number;
}

export interface IFileCleanSettings {
  autoRemoveOldFilesBeforeUpload: boolean;
  autoRemoveOldFilesAtBoot: boolean;
  autoRemoveOldFilesCriteriumDays: number;
}

export interface ICredentialSettings {
  jwtSecret: string;
  jwtExpiresIn: number;
  refreshTokenAttempts: number;
  refreshTokenExpiry: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDebugSettings {
  debugSocketIoEvents: boolean;
  debugSocketReconnect: boolean;
  debugSocketRetries: boolean;
  debugSocketSetup: boolean;
  debugSocketMessages: boolean;
  debugSocketIoBandwidth: boolean;
}

export interface IServerSettings {
  sentryDiagnosticsEnabled: boolean;
  debugSettings: IDebugSettings;
  loginRequired: boolean;
  registration: boolean;
  experimentalMoonrakerSupport: boolean;
  experimentalBambuSupport: boolean;
  experimentalClientSupport: boolean;
  experimentalThumbnailSupport: boolean;
}

export interface IFrontendSettings {
  gridCols: number;
  gridRows: number;
  largeTiles: boolean;
  tilePreferCancelOverQuickStop: boolean;
}

export interface ITimeoutSettings {
  apiTimeout: number;
}

export interface ISettings {
  [wizardSettingKey]: IWizardSettings;
  [printerFileCleanSettingKey]: IFileCleanSettings;
  [credentialSettingsKey]: ICredentialSettings;
  [serverSettingsKey]: IServerSettings;
  [frontendSettingKey]: IFrontendSettings;
  [timeoutSettingKey]: ITimeoutSettings;
}

const SettingsSchema = new Schema<ISettings>({
  [wizardSettingKey]: {
    wizardCompleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    wizardCompletedAt: {
      type: Date,
      default: null,
      required: false,
    },
    wizardVersion: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  [printerFileCleanSettingKey]: {
    autoRemoveOldFilesBeforeUpload: {
      type: Boolean,
      default: false,
      required: true,
    },
    autoRemoveOldFilesAtBoot: {
      type: Boolean,
      default: false,
      required: true,
    },
    autoRemoveOldFilesCriteriumDays: {
      type: Number,
      default: 14,
      required: true,
    },
  },
  [credentialSettingsKey]: {
    type: {
      jwtSecret: {
        type: String,
        minlength: 10,
        trim: true,
        required: true,
      },
      jwtExpiresIn: {
        type: Number,
        required: true,
      },
      refreshTokenAttempts: {
        type: Number,
        required: true,
      },
      refreshTokenExpiry: {
        type: Number,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
    required: true,
  },
  [serverSettingsKey]: {
    sentryDiagnosticsEnabled: {
      type: Boolean,
      default: false,
      required: true,
    },
    debugSettings: {
      debugSocketIoEvents: {
        type: Boolean,
        default: false,
        required: true,
      },
      debugSocketReconnect: {
        type: Boolean,
        default: false,
        required: true,
      },
      debugSocketRetries: {
        type: Boolean,
        default: false,
        required: true,
      },
      debugSocketSetup: {
        type: Boolean,
        default: false,
        required: true,
      },
      debugSocketMessages: {
        type: Boolean,
        default: false,
        required: true,
      },
      debugSocketIoBandwidth: {
        type: Boolean,
        default: false,
        required: true,
      },
    },
    loginRequired: {
      type: Boolean,
      default: true,
      required: true,
    },
    registration: {
      type: Boolean,
      default: false,
      required: true,
    },
    experimentalMoonrakerSupport: {
      type: Boolean,
      default: false,
      required: true,
    },
    experimentalBambuSupport: {
      type: Boolean,
      default: false,
      required: true,
    },
    experimentalClientSupport: {
      type: Boolean,
      default: false,
      required: true,
    },
    experimentalThumbnailSupport: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  [frontendSettingKey]: {
    gridCols: {
      type: Number,
      default: 8,
      required: false,
    },
    gridRows: {
      type: Number,
      default: 8,
      required: false,
    },
    largeTiles: {
      type: Boolean,
      default: false,
      required: false,
    },
    tilePreferCancelOverQuickStop: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  [timeoutSettingKey]: {
    apiTimeout: {
      type: Number,
      default: 1000,
      required: true,
    },
  },
});

export const Settings = model("ServerSettings", SettingsSchema);
