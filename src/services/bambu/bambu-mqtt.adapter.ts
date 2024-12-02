import { ILoggerFactory } from "@/handlers/logger-factory";
import EventEmitter2 from "eventemitter2";
import { SettingsStore } from "@/state/settings.store";
import { AxiosInstance } from "axios";
import { LoggerService } from "@/handlers/logger";
import { ISocketLogin } from "@/shared/dtos/socket-login.dto";

export class BambuMqttAdapter {
  readonly eventEmitter2: EventEmitter2;
  readonly settingsStore: SettingsStore;
  protected readonly httpClient: AxiosInstance;
  protected readonly logger: LoggerService;

  constructor({
    settingsStore,
    httpClient,
    loggerFactory,
    eventEmitter2,
  }: {
    settingsStore: SettingsStore;
    httpClient: AxiosInstance;
    loggerFactory: ILoggerFactory;
    eventEmitter2: EventEmitter2;
  }) {
    this.settingsStore = settingsStore;
    this.httpClient = httpClient;
    this.eventEmitter2 = eventEmitter2;
    this.logger = loggerFactory(BambuMqttAdapter.name);
  }

  registerCredentials(socketLogin: ISocketLogin) {}

  resetSocketState() {}
}
