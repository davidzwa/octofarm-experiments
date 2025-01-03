import { HttpStatusCode } from "@/constants/http-status-codes.constants";
import { AppConstants } from "@/server.constants";
import { ExternalServiceError } from "@/exceptions/runtime.exceptions";
import { httpToWsUrl } from "@/utils/url.utils";
import { normalizeUrl } from "@/utils/normalize-url";
import { OctoprintClient } from "@/services/octoprint/octoprint.client";
import EventEmitter2 from "eventemitter2";
import { LoggerService } from "@/handlers/logger";
import { ConfigService } from "@/services/core/config.service";
import { IdType } from "@/shared.constants";
import { ILoggerFactory } from "@/handlers/logger-factory";
import { AxiosError } from "axios";
import { WebsocketAdapter } from "@/shared/websocket.adapter";
import { OctoPrintEventDto } from "@/services/octoprint/dto/octoprint-event.dto";
import { LoginDto } from "@/services/interfaces/login.dto";
import { SOCKET_STATE, SocketState } from "@/shared/dtos/socket-state.type";
import { API_STATE, ApiState } from "@/shared/dtos/api-state.type";
import { OP_LoginDto } from "@/services/octoprint/dto/auth/login.dto";
import { Event as WsEvent } from "ws";
import { CurrentMessageDto } from "@/services/octoprint/dto/websocket/current-message.dto";
import { OctoprintErrorDto } from "@/services/octoprint/dto/rest/error.dto";
import { OctoprintType } from "@/services/printer-api.interface";
import { IWebsocketAdapter } from "@/services/websocket-adapter.interface";
import { CurrentJobDto } from "@/services/octoprint/dto/job/current-job.dto";
import { sleep } from "@/utils/time.utils";

export const WsMessage = {
  // Custom events
  WS_OPENED: "WS_OPENED",
  WS_CLOSED: "WS_CLOSED",
  WS_ERROR: "WS_ERROR",
  API_STATE_UPDATED: "API_STATE_UPDATED",
  WS_STATE_UPDATED: "WS_STATE_UPDATED",
} as const;

export const OctoPrintMessage = {
  connected: "connected",
  reauthRequired: "reauthRequired",
  current: "current",
  history: "history",
  event: "event",
  plugin: "plugin",
  timelapse: "timelapse",
  slicingProgress: "slicingProgress",
} as const;

export const octoPrintEvent = (event: string) => `octoprint.${event}`;

export class OctoprintWebsocketAdapter<T = IdType> extends WebsocketAdapter implements IWebsocketAdapter<T> {
  public get printerType() {
    return OctoprintType;
  }
  public printerId?: T;

  // TODO design state differently (either centralized, FSM, reducer(s))
  stateUpdated = false;
  stateUpdateTimestamp: null | number = null;
  socketState: SocketState = SOCKET_STATE.unopened;
  apiStateUpdated = false;
  apiStateUpdateTimestamp: null | number = null;
  apiState: ApiState = API_STATE.unset;
  lastMessageReceivedTimestamp: null | number = null;
  reauthRequired = false;
  reauthRequiredTimestamp: null | number = null;

  protected declare logger: LoggerService;
  private octoprintClient: OctoprintClient;
  private eventEmitter: EventEmitter2;

  // Make immutable or part of FSM
  login?: LoginDto;
  private socketURL?: URL;
  private sessionDto?: OP_LoginDto;
  private username?: string;

  // Redesign and make super robust (memory leaks)
  private refreshPrinterCurrentInterval?: NodeJS.Timeout;

  constructor({
    loggerFactory,
    octoprintClient,
    eventEmitter2,
    configService,
  }: {
    loggerFactory: ILoggerFactory;
    octoprintClient: OctoprintClient;
    eventEmitter2: EventEmitter2;
    configService: ConfigService;
  }) {
    super({ loggerFactory, configService });

    this.logger = loggerFactory(OctoprintWebsocketAdapter.name);
    this.octoprintClient = octoprintClient;
    this.eventEmitter = eventEmitter2;
  }

  // Would expect an async function to be entry-point
  async connect(printerId: T, loginDto: LoginDto): Promise<void> {
    // TODO deal with existing socket

    this.printerId = printerId;
    this.login = loginDto;

    const httpUrl = normalizeUrl(this.login.printerURL);
    const wsUrl = httpToWsUrl(httpUrl);
    wsUrl.pathname = "/sockjs/websocket";
    this.socketURL = wsUrl;

    // TODO connect here
  }

  // Specific, overloaded
  async reconnect() {
    this.logger.log("'reauthSession' called");

    await this.initSession();

    super.open(this.socketURL);

    let tries = 5;
    while (this.socket.readyState === WebSocket.CONNECTING && tries-- > 0) {
      this.logger.log("Waiting for websocket to open, 150ms");
      await sleep(150);
    }

    if (this.isClosedOrAborted()) {
      this.logger.log("Could not setup websocket within expected time. Closing");
      return;
    }

    this.resetReauthRequired();
  }

  // Would expect an async function, expect a guaranteed closure
  async disconnect(): Promise<void> {
    clearInterval(this.refreshPrinterCurrentInterval);
    super.close();
  }

  private needsReopen() {
    const isApiOnline = this.apiState === API_STATE.responding;
    return isApiOnline && (this.socketState === SOCKET_STATE.closed || this.socketState === SOCKET_STATE.error);
  }

  private needsSetup() {
    return this.socketState === SOCKET_STATE.unopened;
  }

  private isClosedOrAborted() {
    return this.socketState === SOCKET_STATE.closed || this.socketState === SOCKET_STATE.aborted;
  }

  // Overloaded and specific
  async initSession(): Promise<void> {
    this.logger.log("Setting up socket session - resetting socket state");
    this.resetSocketState();
    this.allowEmittingEvents();

    this.logger.log("Setting up socket session - logging in");
    this.sessionDto = await this.octoprintClient
      .login(this.login)
      .then((d) => {
        const r = d.data;
        // Check response for red flags
        if (r.name === "_api") {
          // TODO this conclusion is often wrong (when server is disconnected)
          this.setApiState("globalKey");
          this.setSocketState("aborted");
          throw new ExternalServiceError("Global API Key detected, aborting socket connection", "OctoPrint");
        } else if (r.needs?.group[0] === "guests") {
          this.logger.warn("Detected group guests in OctoPrint login response, marking as unauthorized");
          // This doesn't occur often (instead a 400 with CSRF failed is returned)
          this.setApiState("authFail");
          this.setSocketState("aborted");
          throw new ExternalServiceError("Guest group detected, authentication failed, aborting socket connection", "OctoPrint");
        }
        this.setApiState("responding");
        this.setSocketState("opening");
        return r;
      })
      .catch((e: AxiosError) => {
        this.setSocketState("aborted");
        // TODO improve error type detection
        if (e instanceof ExternalServiceError) {
          this.logger.warn(`Printer authorization error, apiState: ${this.apiState}`);
          throw e;
        } else {
          if (e?.response?.status === 403) {
            this.setApiState("authFail");
            this.setSocketState("aborted");
            throw new ExternalServiceError(e, "OctoPrint");
          }
          // We make an exception for such a problem concerning log anonymization
          this.logger.error(`Printer (${this.printerId}) network or transport error, marking it as unreachable; ${e}`);
          this.setApiState("noResponse");
        }
        throw e;
      });

    this.logger.log("Setting up socket session - fetching username");
    this.username = await this.octoprintClient.getAdminUserOrDefault(this.login).catch((e: AxiosError) => {
      const status = e.response?.status;
      if (status === HttpStatusCode.FORBIDDEN) {
        this.setApiState("authFail");
        this.setSocketState("aborted");
      } else {
        this.setApiState("authFail");
        this.setSocketState("aborted");
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

    this.logger.log("Setting up socket session - call interval loop manually");
    await this.updateCurrentStateSafely();

    this.logger.log("Setting up socket session - setting up printer current interval loop (10 sec)");
    if (this.refreshPrinterCurrentInterval) {
      clearInterval(this.refreshPrinterCurrentInterval);
    }
    this.refreshPrinterCurrentInterval = setInterval(async () => {
      await this.updateCurrentStateSafely();
      // This timeout should be greater than or equal to the API timeout
    }, 10000);
  }

  /**
   * Re-fetch the printer current state without depending on Websocket
   * @private
   */
  private async updateCurrentStateSafely() {
    this.logger.log(`Printer current interval loop called`);

    try {
      const current = await this.octoprintClient.getPrinterCurrent(this.login, true);
      const isOperational = current.data?.state?.flags?.operational;
      const job = isOperational ? await this.octoprintClient.getJob(this.login) : ({} as CurrentJobDto);
      this.setApiState(API_STATE.responding);
      return await this.emitEvent("current", { ...current.data, progress: job?.progress, job: job?.job });
    } catch (e) {
      if ((e as AxiosError).isAxiosError) {
        const castError = e as OctoprintErrorDto;
        if (castError?.response?.status == 409) {
          this.logger.error(`Printer current interval loop error`);
          await this.emitEvent("current", {
            state: {
              flags: {
                operational: false,
                error: false,
              },
              text: "USB disconnected",
              error: castError?.response.data.error,
            },
          } as CurrentMessageDto);
          return;
        }
        this.logger.error(`Could not update Octoprint current due to a request error`);
        this.setApiState(API_STATE.noResponse);
        return;
      }
      this.logger.error(`Could not update Octoprint current due to an unknown error`);
      this.setApiState(API_STATE.noResponse);
    }
  }

  // Specific
  private setReauthRequired() {
    this.reauthRequired = true;
    this.reauthRequiredTimestamp = Date.now();
  }

  // Specific
  private resetReauthRequired() {
    this.reauthRequired = false;
    this.reauthRequiredTimestamp = null;
  }

  // Generic
  resetSocketState() {
    this.setSocketState("unopened");
    this.setApiState("unset");
  }

  // Generic-ish
  emitEventSync(event: string, payload: any) {
    if (!this.eventEmittingAllowed) {
      return;
    }

    this.eventEmitter.emit(octoPrintEvent(event), {
      event,
      payload,
      printerId: this.printerId,
      printerType: OctoprintType,
    } as OctoPrintEventDto);
  }

  // Generic + specific
  protected async afterOpened(_: WsEvent): Promise<void> {
    this.setSocketState("opened");
    await this.sendAuth();
    await this.sendThrottle(AppConstants.defaultSocketThrottleRate);
  }

  // Bit generic, mostly specific
  protected async onMessage(message: string): Promise<void> {
    this.lastMessageReceivedTimestamp = Date.now();

    if (this.socketState !== SOCKET_STATE.authenticated) {
      this.setSocketState("authenticated");
    }

    const data = JSON.parse(message);
    const eventName = Object.keys(data)[0];
    const payload = data[eventName];

    this.logger.log(`RX Msg ${eventName} ${message.substring(0, 140)}...`);

    if (eventName === OctoPrintMessage.reauthRequired) {
      this.logger.log("Received 'reauthRequired', acting on it");
      this.setReauthRequired();
    }

    // Emit the message to the event bus
    await this.emitEvent(eventName, payload);
  }

  // Generic
  protected async afterClosed(event: any) {
    this.logger.log("'afterClosed' handler called");

    this.setSocketState("closed");
    delete this.socket;
    await this.emitEvent(WsMessage.WS_CLOSED, "connection closed");
  }

  // Generic
  protected async onError(error: any) {
    this.setSocketState("error");
    await this.emitEvent(WsMessage.WS_ERROR, error?.length ? error : "connection error");
  }

  // Generic-ish
  private async emitEvent(event: string, payload?: any) {
    if (!this.eventEmittingAllowed) {
      return;
    }

    await this.eventEmitter.emitAsync(octoPrintEvent(event), {
      event,
      payload,
      printerId: this.printerId,
      printerType: 0,
    } as OctoPrintEventDto);
  }

  // Specific
  private async sendAuth(): Promise<void> {
    const sessionCredentials = `${this.username}:${this.sessionDto.session}`;
    this.logger.log(`Sending auth ${sessionCredentials}`);

    this.setSocketState(SOCKET_STATE.authenticating as SocketState);

    // TODO test what happens if authentication is incorrect
    await this.sendMessage(
      JSON.stringify({
        auth: sessionCredentials,
      })
    );
  }

  // Specific
  private async sendThrottle(throttle: number = AppConstants.defaultSocketThrottleRate): Promise<void> {
    return await this.sendMessage(JSON.stringify({ throttle }));
  }

  // Generic
  private setSocketState(state: SocketState) {
    this.socketState = state;
    this.stateUpdated = true;
    this.stateUpdateTimestamp = Date.now();
    if (this._debugMode) {
      this.logger.log(`${this.printerId} Socket state updated to: ` + state);
    }
    this.emitEventSync(WsMessage.WS_STATE_UPDATED, state);
  }

  // Generic
  private setApiState(state: ApiState) {
    if (state === API_STATE.globalKey) {
      this.logger.warn("Global API Key WS State detected");
    }
    this.apiState = state;
    this.apiStateUpdated = true;
    this.apiStateUpdateTimestamp = Date.now();
    if (this._debugMode) {
      this.logger.log(`${this.printerId} API state updated to: ` + state);
    }
    this.emitEventSync(WsMessage.API_STATE_UPDATED, state);
  }
}
