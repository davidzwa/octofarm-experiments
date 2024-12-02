import EventEmitter2 from "eventemitter2";
import { AxiosInstance, AxiosPromise } from "axios";
import { LoggerService } from "@/handlers/logger";
import { SettingsStore } from "@/state/settings.store";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { LoginDto } from "@/services/interfaces/login.dto";

export class BambuClient {
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
    this.logger = loggerFactory(BambuClient.name);
  }

  async getApiVersion(login: LoginDto, timeout?: number): AxiosPromise<{ version: string }> {
    return this.httpClient.get<{ version: string }>(`${login.printerURL}/api/info`);
  }
}
