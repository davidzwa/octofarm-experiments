import { HttpStatusCode } from "@/constants/http-status-codes.constants";
import { AppConstants } from "@/server.constants";
import { ExternalServiceError } from "@/exceptions/runtime.exceptions";
import { httpToWsUrl } from "@/utils/url.utils";
import { normalizeUrl } from "@/utils/normalize-url";
import { OctoPrintApiService } from "@/services/octoprint/octoprint-api.service";
import EventEmitter2 from "eventemitter2";
import { LoggerService } from "@/handlers/logger";
import { ConfigService } from "@/services/core/config.service";
import { IdType } from "@/shared.constants";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { AxiosError } from "axios";
import { OctoPrintSessionDto } from "./dto/octoprint-session.dto";
import { IPrinterSocketLogin, PrinterLoginDto } from "@/shared/dtos/printer-login.dto";
import { WebsocketAdapter } from "@/shared/websocket.adapter";
import { OctoPrintEventDto } from "@/services/octoprint/dto/octoprint-event.dto";

type ThrottleRate = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const Message = {
  connected: "connected",
  reauthRequired: "reauthRequired",
  current: "current",
  history: "history",
  event: "event",
  plugin: "plugin",
  timelapse: "timelapse",
  slicingProgress: "slicingProgress",

  // Custom events
  WS_OPENED: "WS_OPENED",
  WS_CLOSED: "WS_CLOSED",
  WS_ERROR: "WS_ERROR",
  API_STATE_UPDATED: "API_STATE_UPDATED",
  WS_STATE_UPDATED: "WS_STATE_UPDATED",
};

export const SOCKET_STATE = {
  unopened: "unopened",
  opening: "opening",
  authenticating: "authenticating",
  opened: "opened",
  authenticated: "authenticated",
  aborted: "aborted",
  error: "error",
  closed: "closed",
};

export const API_STATE = {
  unset: "unset",
  noResponse: "noResponse",
  globalKey: "globalKey",
  authFail: "authFail",
  responding: "responding",
};

export const octoPrintEvent = (event: string) => `octoprint.${event}`;

export class OctoPrintSockIoAdapter extends WebsocketAdapter {
  octoPrintApiService: OctoPrintApiService;
  eventEmitter: EventEmitter2;
  configService: ConfigService;

  public printerId?: IdType;
  stateUpdated = false;
  stateUpdateTimestamp: null | number = null;
  socketState = SOCKET_STATE.unopened;
  apiStateUpdated = false;
  apiStateUpdateTimestamp: null | number = null;
  apiState = API_STATE.unset;
  lastMessageReceivedTimestamp: null | number = null;
  reauthRequired = false;
  reauthRequiredTimestamp: null | number = null;
  loginDto?: PrinterLoginDto;
  protected logger: LoggerService;
  private socketURL?: URL;
  private sessionDto?: OctoPrintSessionDto;
  private username?: string;

  constructor({
    loggerFactory,
    octoPrintApiService,
    eventEmitter2,
    configService,
  }: {
    loggerFactory: ILoggerFactory;
    octoPrintApiService: OctoPrintApiService;
    eventEmitter2: EventEmitter2;
    configService: ConfigService;
  }) {
    super({ loggerFactory });

    this.logger = loggerFactory(OctoPrintSockIoAdapter.name);
    this.octoPrintApiService = octoPrintApiService;
    this.eventEmitter = eventEmitter2;
    this.configService = configService;
  }

  get _debugMode() {
    return this.configService.get(AppConstants.debugSocketStatesKey, AppConstants.defaultDebugSocketStates) === "true";
  }

  needsReopen() {
    const isApiOnline = this.apiState === API_STATE.responding;
    return isApiOnline && (this.socketState === SOCKET_STATE.closed || this.socketState === SOCKET_STATE.error);
  }

  needsSetup() {
    return this.socketState === SOCKET_STATE.unopened;
  }

  // needsReset() {
  //   return this.apiState === API_STATE.resetting;
  // }

  needsReauth() {
    return this.reauthRequired;
  }

  isClosedOrAborted() {
    return this.socketState === SOCKET_STATE.closed || this.socketState === SOCKET_STATE.aborted;
  }

  registerCredentials(socketLogin: IPrinterSocketLogin) {
    const { printerId, loginDto, protocol } = socketLogin;
    this.printerId = printerId;
    this.loginDto = loginDto;

    const httpUrl = normalizeUrl(this.loginDto.printerURL);
    const wsUrl = httpToWsUrl(httpUrl, protocol);
    wsUrl.pathname = "/sockjs/websocket";
    this.socketURL = wsUrl;
  }

  open() {
    if (this.socket) {
      throw new Error(`Socket already exists (printerId: ${this.printerId}, ignoring open request`);
    }
    super.open(this.socketURL);
  }

  close() {
    super.close();
  }

  async sendThrottle(throttle: ThrottleRate = AppConstants.defaultSocketThrottleRate): Promise<void> {
    return await this.sendMessage(JSON.stringify({ throttle }));
  }

  async reauthSession() {
    await this.setupSocketSession();
    await this.sendAuth();
    this.resetReauthRequired();
  }

  /**
   * Retrieve session token by authenticating with OctoPrint API
   */
  async setupSocketSession(): Promise<void> {
    this.resetSocketState();
    this.sessionDto = await this.octoPrintApiService
      .login(this.loginDto)
      .then((r) => {
        // Check response for red flags
        if (r.name === "_api") {
          this.setApiState(API_STATE.globalKey);
          this.setSocketState(SOCKET_STATE.aborted);
          throw new ExternalServiceError("Global API Key detected, aborting socket connection");
        } else if (r.needs?.group[0] === "guests") {
          this.logger.warn("Detected group guests in OctoPrint login response, marking as unauthorized");
          // This doesn't occur often (instead a 400 with CSRF failed is returned)
          this.setApiState(API_STATE.authFail);
          this.setSocketState(SOCKET_STATE.aborted);
          throw new ExternalServiceError("Guest group detected, authentication failed, aborting socket connection");
        }
        this.setApiState(API_STATE.responding);
        this.setSocketState(SOCKET_STATE.opening);
        return r;
      })
      .catch((e: AxiosError) => {
        this.setSocketState(SOCKET_STATE.aborted);
        // TODO improve error type detection
        if (e instanceof ExternalServiceError) {
          this.logger.warn(`Printer authorization error (id: ${this.printerId}), apiState: ${this.apiState}`);
          throw e;
        } else {
          if (e?.response?.status === 403) {
            this.setApiState(API_STATE.authFail);
            this.setSocketState(SOCKET_STATE.aborted);
            throw new ExternalServiceError(e);
          }
          this.logger.error(`Printer (${this.printerId}) network or transport error, marking it as unreachable; ${e}`);
          this.setApiState(API_STATE.noResponse);
        }
        throw e;
      });

    this.username = await this.octoPrintApiService.getAdminUserOrDefault(this.loginDto).catch((e: AxiosError) => {
      const status = e.response?.status;
      if (status === HttpStatusCode.FORBIDDEN) {
        this.setApiState(API_STATE.authFail);
        this.setSocketState(SOCKET_STATE.aborted);
      } else {
        this.setApiState(API_STATE.authFail);
        this.setSocketState(SOCKET_STATE.aborted);
      }
      if (
        [
          HttpStatusCode.BAD_GATEWAY,
          HttpStatusCode.NOT_IMPLEMENTED,
          HttpStatusCode.SERVICE_UNAVAILABLE,
          HttpStatusCode.GATEWAY_TIMEOUT,
        ].includes(status)
      ) {
        this.logger.error(`Detected a 501-504 error (${status}) probably OctoPrint has crashed or is restarting`);
      }
      throw e;
    });
  }

  setReauthRequired() {
    this.reauthRequired = true;
    this.reauthRequiredTimestamp = Date.now();
  }

  resetReauthRequired() {
    this.reauthRequired = false;
    this.reauthRequiredTimestamp = null;
  }

  resetSocketState() {
    this.setSocketState(SOCKET_STATE.unopened);
    this.setApiState(API_STATE.unset);
  }

  /**
   * @private
   * @param {API_STATE} state
   */
  private setApiState(state: string) {
    this.apiState = state;
    this.apiStateUpdated = true;
    this.apiStateUpdateTimestamp = Date.now();
    if (this._debugMode) {
      this.logger.log(`${this.printerId} API state updated to: ` + state);
    }
    this.emitEventSync(Message.API_STATE_UPDATED, state);
  }

  /**
   * @private
   * @param {SOCKET_STATE} state
   */
  private setSocketState(state) {
    this.socketState = state;
    this.stateUpdated = true;
    this.stateUpdateTimestamp = Date.now();
    if (this._debugMode) {
      this.logger.log(`${this.printerId} Socket state updated to: ` + state);
    }
    this.emitEventSync(Message.WS_STATE_UPDATED, state);
  }

  /**
   * @private
   * @param {Message} event
   * @param {?Object} payload
   */
  private async emitEvent(event: string, payload) {
    await this.eventEmitter.emitAsync(octoPrintEvent(event), {
      event,
      payload,
      printerId: this.printerId,
    } as OctoPrintEventDto);
  }

  emitEventSync(event: string, payload) {
    this.eventEmitter.emit(octoPrintEvent(event), {
      event,
      payload,
      printerId: this.printerId,
    } as OctoPrintEventDto);
  }

  protected async afterOpened(event): Promise<void> {
    this.setSocketState(SOCKET_STATE.opened);
    await this.sendAuth();
    await this.sendThrottle(AppConstants.defaultSocketThrottleRate);
  }

  protected async onMessage(message): Promise<void> {
    this.lastMessageReceivedTimestamp = Date.now();

    if (this.socketState !== SOCKET_STATE.authenticated) {
      this.setSocketState(SOCKET_STATE.authenticated);
    }

    const data = JSON.parse(message);
    const eventName = Object.keys(data)[0];
    const payload = data[eventName];

    if (eventName === Message.reauthRequired) {
      this.setReauthRequired();
    }

    // Emit the message to the event bus
    await this.emitEvent(eventName, payload);
  }

  protected async afterClosed(event) {
    this.setSocketState(SOCKET_STATE.closed);
    delete this.socket;
    await this.emitEvent(Message.WS_CLOSED);
  }

  protected async onError(error) {
    this.setSocketState(SOCKET_STATE.error);
    await this.emitEvent(Message.WS_ERROR, error);
  }

  private async sendAuth(): Promise<void> {
    this.setSocketState(SOCKET_STATE.authenticating);
    await this.sendMessage(
      JSON.stringify({
        auth: `${this.username}:${this.sessionDto.session}`,
      })
    );
    // TODO what if bad auth? => pure silence right?
  }
}
