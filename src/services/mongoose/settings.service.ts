import { Settings } from "@/models";
import {
  credentialSettingsKey,
  printerFileCleanSettingKey,
  frontendSettingKey,
  getDefaultCredentialSettings,
  getDefaultFileCleanSettings,
  getDefaultFrontendSettings,
  getDefaultServerSettings,
  getDefaultSettings,
  getDefaultTimeout,
  getDefaultWizardSettings,
  serverSettingsKey,
  timeoutSettingKey,
  wizardSettingKey,
} from "@/constants/server-settings.constants";
import { validateInput } from "@/handlers/validators";
import {
  credentialSettingPatchRules,
  fileCleanSettingsUpdateRules,
  frontendSettingsUpdateRules,
  serverSettingsUpdateRules,
  timeoutSettingsUpdateRules,
  wizardUpdateRules,
} from "../validators/settings-service.validation";
import { ISettingsService } from "@/services/interfaces/settings.service.interface";
import {
  ICredentialSettings,
  IFileCleanSettings,
  IFrontendSettings,
  IServerSettings,
  ISettings,
  ITimeoutSettings,
  IWizardSettings,
} from "@/models/Settings";
import { SettingsDto } from "@/services/interfaces/settings.dto";
import { MongoIdType } from "@/shared.constants";
import { ConfigService } from "@/services/core/config.service";

export class SettingsService implements ISettingsService<MongoIdType, ISettings> {
  configService: ConfigService;
  constructor({ configService }: { configService: ConfigService }) {
    this.configService = configService;
  }

  toDto(entity: ISettings): SettingsDto<MongoIdType> {
    return {
      // Credential settings are not shared with the client
      [serverSettingsKey]: {
        ...entity[serverSettingsKey],
        experimentalTypeormSupport: false,
      },
      [wizardSettingKey]: entity[wizardSettingKey],
      [frontendSettingKey]: entity[frontendSettingKey],
      [printerFileCleanSettingKey]: entity[printerFileCleanSettingKey],
      [timeoutSettingKey]: entity[timeoutSettingKey],
    };
  }

  async getOrCreate() {
    let settings = await Settings.findOne();
    if (!settings) {
      const defaultSettings = new Settings(getDefaultSettings());
      await defaultSettings.save();

      // Return to upper layer
      return defaultSettings;
    } else {
      // Perform patch of settings
      settings = this.migrateSettingsRuntime(settings);

      return Settings.findOneAndUpdate({ _id: settings.id }, settings, { new: true });
    }
  }

  /**
   * Patch the given settings object manually - runtime migration strategy
   */
  migrateSettingsRuntime(knownSettings: Partial<ISettings>) {
    const doc = knownSettings; // alias _doc also works
    if (!doc[printerFileCleanSettingKey]) {
      doc[printerFileCleanSettingKey] = getDefaultFileCleanSettings();
    } else {
      // Remove superfluous settings
      doc[printerFileCleanSettingKey] = {
        autoRemoveOldFilesBeforeUpload: doc[printerFileCleanSettingKey].autoRemoveOldFilesBeforeUpload,
        autoRemoveOldFilesAtBoot: doc[printerFileCleanSettingKey].autoRemoveOldFilesBeforeUpload,
        autoRemoveOldFilesCriteriumDays: doc[printerFileCleanSettingKey].autoRemoveOldFilesCriteriumDays,
      };
    }

    // Server settings exist, but need updating with new ones if they don't exist.
    if (!doc[wizardSettingKey]) {
      doc[wizardSettingKey] = getDefaultWizardSettings();
    }
    if (!doc[timeoutSettingKey]) {
      doc[timeoutSettingKey] = getDefaultTimeout();
    }
    if (!doc[serverSettingsKey]) {
      doc[serverSettingsKey] = getDefaultServerSettings();
    } else {
      // Remove superfluous settings
      doc[serverSettingsKey] = {
        debugSettings: doc[serverSettingsKey].debugSettings,
        loginRequired: doc[serverSettingsKey].loginRequired,
        registration: doc[serverSettingsKey].registration,
        experimentalClientSupport: doc[serverSettingsKey].experimentalClientSupport,
        experimentalMoonrakerSupport: doc[serverSettingsKey].experimentalMoonrakerSupport,
        sentryDiagnosticsEnabled: doc[serverSettingsKey].sentryDiagnosticsEnabled,
        experimentalThumbnailSupport: doc[serverSettingsKey].experimentalThumbnailSupport,
        experimentalBambuSupport: true,
      };
    }
    if (!doc[credentialSettingsKey]) {
      doc[credentialSettingsKey] = getDefaultCredentialSettings();
    }
    if (!doc[frontendSettingKey]) {
      doc[frontendSettingKey] = getDefaultFrontendSettings();
    }

    return knownSettings;
  }

  async patchFileCleanSettings(patchUpdate: Partial<IFileCleanSettings>) {
    const validatedInput = await validateInput(patchUpdate, fileCleanSettingsUpdateRules);

    const settingsDoc = await this.getOrCreate();
    settingsDoc[printerFileCleanSettingKey] = Object.assign(settingsDoc[printerFileCleanSettingKey], validatedInput);
    return Settings.findOneAndUpdate({ _id: settingsDoc.id }, settingsDoc, {
      new: true,
    });
  }

  async patchWizardSettings(patchUpdate: Partial<IWizardSettings>) {
    const validatedInput = await validateInput(patchUpdate, wizardUpdateRules);

    const settingsDoc = await this.getOrCreate();
    settingsDoc[wizardSettingKey] = Object.assign(settingsDoc[wizardSettingKey], validatedInput);
    return Settings.findOneAndUpdate({ _id: settingsDoc.id }, settingsDoc, {
      new: true,
    });
  }

  async updateFrontendSettings(patchUpdate: IFrontendSettings) {
    const validatedInput = await validateInput(patchUpdate, frontendSettingsUpdateRules);

    const settingsDoc = await this.getOrCreate();
    const frontendSettings = settingsDoc[frontendSettingKey];
    Object.assign(frontendSettings, validatedInput);
    return Settings.findOneAndUpdate({ _id: settingsDoc.id }, settingsDoc, {
      new: true,
    });
  }

  async patchCredentialSettings(patchUpdate: Partial<ICredentialSettings>) {
    const validatedInput = await validateInput(patchUpdate, credentialSettingPatchRules);

    const settingsDoc = await this.getOrCreate();
    const credentialSettings = settingsDoc[credentialSettingsKey];
    Object.assign(credentialSettings, validatedInput);
    return Settings.findOneAndUpdate({ _id: settingsDoc.id }, settingsDoc, {
      new: true,
    });
  }

  async patchServerSettings(patchUpdate: Partial<IServerSettings>) {
    const validatedInput = await validateInput(patchUpdate, serverSettingsUpdateRules);

    const settingsDoc = await this.getOrCreate();
    const serverSettings = settingsDoc[serverSettingsKey];
    Object.assign(serverSettings, validatedInput);
    return Settings.findOneAndUpdate({ _id: settingsDoc.id }, settingsDoc, {
      new: true,
    });
  }

  async updateTimeoutSettings(patchUpdate: Partial<ITimeoutSettings>) {
    const validatedInput = await validateInput(patchUpdate, timeoutSettingsUpdateRules);

    const settingsDoc = await this.getOrCreate();
    const timeoutSettings = settingsDoc[timeoutSettingKey];
    Object.assign(timeoutSettings, validatedInput);
    return Settings.findOneAndUpdate({ _id: settingsDoc.id }, settingsDoc, {
      new: true,
    });
  }
}
