import { DITokens } from "@/container.tokens";
import { MoonrakerType, OctoprintType } from "@/services/printer-api.interface";
import { SettingsStore } from "@/state/settings.store";
import { IWebsocketAdapter } from "@/services/websocket-adapter.interface";

export class PrinterAdapterFactory {
  cradle: any;

  constructor(cradle: {}) {
    this.cradle = cradle;
  }

  createInstance(printerType: number): IWebsocketAdapter {
    const settingsStore = this.cradle[DITokens.settingsStore] as SettingsStore;
    const serverSettings = settingsStore.getServerSettings();
    const moonrakerSupport = serverSettings.experimentalMoonrakerSupport;

    if (printerType === OctoprintType) {
      return this.cradle[DITokens.octoPrintSockIoAdapter];
    } else if (moonrakerSupport && printerType === MoonrakerType) {
      return this.cradle[DITokens.moonrakerWebsocketAdapter];
    } else {
      throw new Error("PrinterType is unknown, cant pick the right socket adapter");
    }
  }
}
