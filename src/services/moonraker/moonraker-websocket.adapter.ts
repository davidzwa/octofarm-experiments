import { MoonrakerClient } from "@/services/moonraker/moonraker.client";
import { ILoggerFactory } from "@/handlers/logger-factory";
import EventEmitter2 from "eventemitter2";
import { ConfigService } from "@/services/core/config.service";
import { LoggerService } from "@/handlers/logger";
import { IdType } from "@/shared.constants";
import { AppConstants } from "@/server.constants";
import { httpToWsUrl } from "@/utils/url.utils";
import { OctoPrintEventDto } from "@/services/octoprint/dto/octoprint-event.dto";
import { WsMessage } from "@/services/octoprint/octoprint-websocket.adapter";
import { moonrakerEvent } from "@/services/moonraker/constants/websocket.constants";
import { SOCKET_STATE, SocketState } from "@/shared/dtos/socket-state.type";
import { API_STATE, ApiState } from "@/shared/dtos/api-state.type";
import { LoginDto } from "@/services/interfaces/login.dto";
import { ConnectionIdentifyDto } from "@/services/moonraker/dto/websocket/connection-identify.dto";
import { JsonRpcEventDto } from "@/services/moonraker/dto/websocket/json-rpc-event.dto";
import { KnownPrinterObject } from "@/services/moonraker/dto/objects/printer-objects-list.dto";
import { NotifyStatusUpdate } from "@/services/moonraker/dto/websocket/message.types";
import {
  DisplayStatusObject,
  ExtruderObject,
  FanObject,
  GcodeMoveObject,
  HeaterBedObject,
  HeatersObject,
  IdleTimeoutObject,
  MotionReportObject,
  PauseResumeObject,
  PrintStatsObject,
  StepperEnableObject,
  SystemStatsObject,
  VirtualSdCardObject,
  WebhooksObject,
} from "@/services/moonraker/dto/objects/printer-object.types";
import { PP } from "@/utils/pretty-print.utils";
import { MoonrakerErrorDto } from "@/services/moonraker/dto/rest/error.dto";
import { MoonrakerEventDto } from "@/services/moonraker/constants/moonraker-event.dto";
import { PrinterObjectsQueryDto } from "@/services/moonraker/dto/objects/printer-objects-query.dto";
import _ from "lodash";
import { ConnectionIdentifyResponseDto } from "@/services/moonraker/dto/websocket/connection-identify-response.dto";
import { FlagsDto } from "@/services/octoprint/dto/printer/flags.dto";
import { CurrentMessageDto } from "@/services/octoprint/dto/websocket/current-message.dto";
import { Event as WsEvent } from "ws";
import { NotifyServiceStateChangedParams } from "@/services/moonraker/dto/websocket/notify-service-state-changed.params";
import { WebsocketRpcExtendedAdapter } from "@/shared/websocket-rpc-extended.adapter";
import { IWebsocketAdapter } from "@/services/websocket-adapter.interface";
import { MoonrakerType } from "@/services/printer-api.interface";

export type SubscriptionType = IdleTimeoutObject &
  PauseResumeObject &
  PrintStatsObject &
  HeatersObject &
  HeaterBedObject &
  ExtruderObject &
  DisplayStatusObject &
  WebhooksObject &
  VirtualSdCardObject &
  GcodeMoveObject &
  StepperEnableObject &
  FanObject &
  MotionReportObject &
  SystemStatsObject;

export class MoonrakerWebsocketAdapter<T = IdType> extends WebsocketRpcExtendedAdapter implements IWebsocketAdapter<T> {
  public get printerType() {
    return MoonrakerType;
  }

  public printerId?: T;
  socketState: SocketState = SOCKET_STATE.unopened;
  lastMessageReceivedTimestamp: null | number = null;
  stateUpdated = false;
  stateUpdateTimestamp: null | number = null;
  apiStateUpdated = false;
  apiStateUpdateTimestamp: null | number = null;
  apiState: ApiState = API_STATE.unset;
  login?: LoginDto;
  private socketURL?: URL;
  private readonly serverVersion: string;

  protected declare logger: LoggerService;
  private client: MoonrakerClient;
  private eventEmitter: EventEmitter2;
  private configService: ConfigService;

  refreshPrinterObjectsInterval?: NodeJS.Timeout;
  private get subscriptionObjects() {
    return {
      pause_resume: [],
      idle_timeout: [],
      print_stats: [],
      heaters: [],
      heater_bed: [],
      extruder: [],
      display_status: [],
      webhooks: [],
      virtual_sdcard: [],
      gcode_move: [],
      stepper_enable: [],
      fan: [],
      motion_report: [],
      system_stats: [],
      // custom: position, homed_axes, max_velocity, etc
      // toolhead: [],
    } as {
      [k in KnownPrinterObject]: [];
    };
  }
  printerObjects: PrinterObjectsQueryDto<SubscriptionType | null> = {
    eventtime: null,
    status: null,
  };

  constructor({
    moonrakerClient,
    loggerFactory,
    eventEmitter2,
    configService,
    serverVersion,
  }: {
    moonrakerClient: MoonrakerClient;
    loggerFactory: ILoggerFactory;
    eventEmitter2: EventEmitter2;
    configService: ConfigService;
    serverVersion: string;
  }) {
    super({ loggerFactory });
    this.client = moonrakerClient;
    this.logger = loggerFactory(MoonrakerWebsocketAdapter.name);
    this.eventEmitter = eventEmitter2;
    this.configService = configService;
    this.serverVersion = serverVersion;
  }

  async connect(printerId: T, loginDto: LoginDto) {
    this.printerId = printerId;
    this.login = loginDto;

    const wsUrl = httpToWsUrl(this.login.printerURL);
    wsUrl.pathname = "/websocket";
    this.socketURL = wsUrl;
  }

  async reconnect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  close() {
    clearInterval(this.refreshPrinterObjectsInterval);
    super.close();
  }

  async initSession(): Promise<void> {
    // Can 404 or 503
    // const oneshot = await this.client.getAccessOneshotToken(this.login);
    // this.logger.log(`Oneshot ${oneshot.data.result}`);
    // await this.client.getAccessOneshotToken(this.login);

    await this.client.getApiVersion(this.login);
    this.setApiState(API_STATE.responding);

    await this.updateCurrentStateSafely();

    if (this.refreshPrinterObjectsInterval) {
      clearInterval(this.refreshPrinterObjectsInterval);
    }
    this.refreshPrinterObjectsInterval = setInterval(async () => {
      await this.updateCurrentStateSafely();
    }, 15000);
  }

  private async updateCurrentStateSafely() {
    try {
      const query: Partial<Record<KnownPrinterObject, []>> = this.subscriptionObjects;
      const objects = await this.client.getPrinterObjectsQuery<PrinterObjectsQueryDto<SubscriptionType>>(this.login, query);
      this.printerObjects = objects.data.result;
      this.setApiState(API_STATE.responding);
      return await this.emitCurrentEvent(this.printerObjects);
    } catch (e) {
      // Could be network transient error, klippy error, or Moonraker host problem. All scenarios require a different approach.
      // transient: we should retry and if happening regularly report this host as problematic
      // klippy error (503): we should definitely clear up and report this as error
      // Moonraker host error: this means the socket has to be completely shut down
      const castError = e as MoonrakerErrorDto;
      if (castError.isAxiosError) {
        if (castError?.response?.status == 503) {
          this.printerObjects.status = {};
          this.printerObjects.eventtime = Date.now();
          return await this.emitCurrentEvent(this.printerObjects);
        }
        this.logger.error("Could not update Moonraker printer objects due to a request error");
        this.setApiState(API_STATE.noResponse);
        return;
      }

      this.logger.error(`Could not update Moonraker current due to an unknown error`);
      this.setApiState(API_STATE.noResponse);
    }
  }

  protected async afterOpened(_: WsEvent): Promise<void> {
    this.setSocketState(SOCKET_STATE.opened);

    const response = await this.sendRequest<ConnectionIdentifyResponseDto, ConnectionIdentifyDto>({
      jsonrpc: "2.0",
      method: "server.connection.identify",
      params: {
        client_name: "FDM Monster",
        version: this.serverVersion,
        type: "other",
        url: AppConstants.githubUrl,
      },
      id: 1,
    });

    try {
      const query: Partial<Record<KnownPrinterObject, []>> = this.subscriptionObjects;

      const result = await this.client.postSubscribePrinterObjects<PrinterObjectsQueryDto<SubscriptionType>>(
        this.login,
        response.result.connection_id,
        query
      );
      this.printerObjects = result.data.result;
      await this.emitCurrentEvent(this.printerObjects);
    } catch (e) {
      const ae = e as MoonrakerErrorDto;
      if (ae.isAxiosError) {
        if (ae.response.status === 503) {
          // shutdown, we should probably mark this host as problematic
          this.logger.warn(`Klipper host issue ${PP(ae.response.data?.error?.message)}`);
        } else if (ae.response.status === 404) {
          this.logger.error("Error while afterOpened (404) - usually this means Moonraker is still starting");
        }
        this.setApiState(API_STATE.noResponse);
        return;
      }

      this.logger.error("Unknown error while afterOpened");
      this.setApiState(API_STATE.noResponse);
    }
  }

  protected async onEventMessage(event: JsonRpcEventDto): Promise<void> {
    this.lastMessageReceivedTimestamp = Date.now();

    if (this.socketState !== SOCKET_STATE.authenticated) {
      this.setSocketState("authenticated");
    }

    const eventName = event.method;
    if (this._debugMode) {
      this.logger.log(`RX Msg ${eventName} ${JSON.stringify(event.params)?.substring(0, 80)}...`);
    }

    // Emit the message to the event bus
    const payload = event.params?.length ? event.params[0] : undefined;

    if (eventName === "notify_service_state_changed") {
      const serviceChanged = event.params[0] as NotifyServiceStateChangedParams;
      if (
        serviceChanged.klipper?.active_state ||
        serviceChanged.klipper_mcu?.active_state ||
        serviceChanged.moonraker?.active_state
      ) {
        this.logger.log("Received notify_service_state_changed, reloading Moonraker printer objects");
        await this.initSession();
      }
      return;
    }
    if (eventName === "notify_klippy_ready") {
      this.logger.log("Received notify_klippy_ready, reloading Moonraker printer objects");
      return await this.initSession();
    }
    if (eventName === "notify_klippy_disconnected") {
      this.logger.log("Received notify_klippy_disconnected, reloading Moonraker printer objects");
      return await this.initSession();
    }
    if (eventName === "notify_klippy_shutdown") {
      this.logger.log("Received notify_klippy_shutdown, reloading Moonraker printer objects");
      return await this.initSession();
    }

    if (eventName === "notify_status_update") {
      const [data, eventtime] = (event as NotifyStatusUpdate<SubscriptionType>).params;

      const substate = Object.keys(data)[0] as keyof SubscriptionType;
      if (Object.keys(this.printerObjects.status).includes(substate)) {
        this.printerObjects.status = _.merge(this.printerObjects.status, data);
        this.printerObjects.eventtime = eventtime;
        await this.emitCurrentEvent(this.printerObjects);
      } else {
        this.logger.warn(`Substate ${substate} unknown`);
      }
      return;
    }

    await this.emitEvent(eventName, payload);
  }

  emitEventSync(event: string, payload: any) {
    if (!this.eventEmittingAllowed) {
      return;
    }

    this.eventEmitter.emit(moonrakerEvent(event), {
      event,
      payload,
      printerId: this.printerId,
    } as OctoPrintEventDto);
  }

  resetSocketState() {
    this.setSocketState("unopened");
    this.setApiState("unset");
  }

  isClosedOrAborted() {
    return this.socketState === SOCKET_STATE.closed || this.socketState === SOCKET_STATE.aborted;
  }

  protected async afterClosed(event: any) {
    this.setSocketState("closed");
    delete this.socket;
    await this.emitEvent(WsMessage.WS_CLOSED, "connection closed");
  }

  protected async onError(error: any) {
    this.setSocketState("error");
    await this.emitEvent(WsMessage.WS_ERROR, error?.length ? error : "connection error");
  }

  private async emitCurrentEvent(printerObject: PrinterObjectsQueryDto<SubscriptionType>) {
    const originalKlipperObjects = printerObject.status;

    // When klipper not connected expect lots of 503
    // operational => no gcode or file being processed, but properly connected (klipper connected?)
    // notify_klippy_ready,  notify_klippy_shutdown, notify_klippy_disconnected, notify_service_state_changed
    // stop klipper: notify_klippy_disconnected: notify_service_state_changed

    // Better to move this to socket and determine operational, error message there
    // https://github.com/Arksine/moonraker/blob/ba9428558adc70ed8cb3cdcea1723358ead23741/moonraker/components/octoprint_compat.py#L303
    const flags = {
      operational: false,
      printing: false,
      cancelling: false,
      pausing: false,
      paused: false,
      resuming: false,
      finishing: false,
      closedOrError: false,
      error: false,
      ready: false,
      sdReady: false,
    } as FlagsDto;
    let filename = "";
    let printTime = null;

    let stateText = originalKlipperObjects.display_status?.message ?? "Error";
    let error = "";
    if (originalKlipperObjects.print_stats?.state?.length) {
      const systemState = originalKlipperObjects.webhooks;
      const printState = originalKlipperObjects.print_stats.state;

      const idleState = originalKlipperObjects.idle_timeout?.state;
      filename = originalKlipperObjects.print_stats.filename;
      printTime = originalKlipperObjects.print_stats.print_duration;

      flags.operational = systemState.state === "ready";

      if (flags.operational) {
        flags.printing = printState === "printing";
        flags.paused = printState === "paused";
        flags.ready = printState === "standby" && idleState !== "Printing";
        flags.sdReady = true;
      } else {
        flags.error = true;
        stateText = "Klipper reports: " + (systemState.state ?? "unknown")?.toUpperCase();
      }
    }

    const currentMessage: Partial<CurrentMessageDto> = {
      progress: {
        printTime: printTime,
        completion: (originalKlipperObjects.display_status?.progress ?? 0) * 100.0,
      },
      state: {
        text: stateText,
        error,
        flags,
      },
      job: {
        file: {
          name: filename,
          path: filename,
        },
      },
    };

    await this.emitEvent("notify_status_update", originalKlipperObjects);
    await this.emitEvent("current", currentMessage);
  }

  private async emitEvent(event: string, payload?: any) {
    if (!this.eventEmittingAllowed) {
      return;
    }

    await this.eventEmitter.emitAsync(moonrakerEvent(event), {
      event,
      payload,
      printerId: this.printerId,
      printerType: MoonrakerType,
    } as MoonrakerEventDto);
  }

  private setSocketState(state: SocketState) {
    this.socketState = state;
    this.stateUpdated = true;
    this.stateUpdateTimestamp = Date.now();
    if (this._debugMode) {
      this.logger.log(`${this.printerId} Socket state updated to: ` + state);
    }
    this.emitEventSync(WsMessage.WS_STATE_UPDATED, state);
  }

  private setApiState(state: ApiState) {
    if (state === API_STATE.globalKey) {
      throw new Error("GlobalKey is an invalid WS state for Moonraker");
    }
    this.apiState = state;
    this.apiStateUpdated = true;
    this.apiStateUpdateTimestamp = Date.now();
    if (this._debugMode) {
      this.logger.log(`${this.printerId} API state updated to: ` + state);
    }
    this.emitEventSync(WsMessage.API_STATE_UPDATED, state);
  }

  get _debugMode() {
    return this.configService.get(AppConstants.debugSocketStatesKey, AppConstants.defaultDebugSocketStates) === "true";
  }
}
