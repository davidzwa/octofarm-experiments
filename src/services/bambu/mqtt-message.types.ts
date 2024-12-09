import { Value } from "serde-js"; // Assuming a similar JSON value type

export type Message =
  | { type: "Print"; data: Print }
  | { type: "Info"; data: Info }
  | { type: "System"; data: System }
  | { type: "Unknown"; data: string | null }
  | { type: "Connecting" }
  | { type: "Connected" }
  | { type: "Reconnecting" }
  | { type: "Disconnected" };

export interface Print {
  print: PrintData;
}

export interface PrintData {
  upload?: PrintUpload;
  nozzle_temper?: number;
  nozzle_target_temper?: number;
  bed_temper?: number;
  bed_target_temper?: number;
  chamber_temper?: number;
  mc_print_stage?: string;
  heatbreak_fan_speed?: string;
  cooling_fan_speed?: string;
  big_fan1_speed?: string;
  big_fan2_speed?: string;
  mc_percent?: number;
  mc_remaining_time?: number;
  ams_status?: number;
  ams_rfid_status?: number;
  hw_switch_state?: number;
  spd_mag?: number;
  spd_lvl?: number;
  print_error?: number;
  lifecycle?: string;
  wifi_signal?: string;
  gcode_state?: string;
  gcode_file_prepare_percent?: string;
  queue_number?: number;
  queue_total?: number;
  queue_est?: number;
  queue_sts?: number;
  project_id?: string;
  profile_id?: string;
  task_id?: string;
  subtask_id?: string;
  subtask_name?: string;
  gcode_file?: string;
  stg?: Value[];
  stg_cur?: number;
  print_type?: string;
  home_flag?: number;
  mc_print_line_number?: string;
  mc_print_sub_stage?: number;
  sdcard?: boolean;
  force_upgrade?: boolean;
  mess_production_state?: string;
  layer_num?: number;
  total_layer_num?: number;
  s_obj?: Value[];
  fan_gear?: number;
  hms?: Value[];
  online?: PrintOnline;
  ams?: PrintAms;
  ipcam?: PrintIpcam;
  vt_tray?: PrintVtTray;
  lights_report?: PrintLightsReport[];
  upgrade_state?: PrintUpgradeState;
  command?: string;
  msg?: number;
  sequence_id?: string;
}

export interface PrintUpload {
  status: string;
  progress: number;
  message: string;
}

export interface PrintOnline {
  ahb: boolean;
  rfid: boolean;
  version: number;
}

export interface PrintAms {
  ams?: PrintAmsData[];
  ams_exist_bits?: string;
  tray_exist_bits?: string;
  tray_is_bbl_bits?: string;
  tray_tar?: string;
  tray_now?: string;
  tray_pre?: string;
  tray_read_done_bits?: string;
  tray_reading_bits?: string;
  version?: number;
  insert_flag?: boolean;
  power_on_flag?: boolean;
}

export interface PrintAmsData {
  id: string;
  humidity: string;
  temp: string;
  tray: PrintTray[];
}

export interface PrintTray {
  id: string;
  remain?: number;
  k?: number;
  n?: number;
  tag_uid?: string;
  tray_id_name?: string;
  tray_info_idx?: string;
  tray_type?: string;
  tray_sub_brands?: string;
  tray_color?: string;
  tray_weight?: string;
  tray_diameter?: string;
  tray_temp?: string;
  tray_time?: string;
  bed_temp_type?: string;
  bed_temp?: string;
  nozzle_temp_max?: string;
  nozzle_temp_min?: string;
  xcam_info?: string;
  tray_uuid?: string;
}

export interface PrintIpcam {
  ipcam_dev?: string;
  ipcam_record?: string;
  timelapse?: string;
  mode_bits?: number;
}

export interface PrintVtTray {
  id: string;
  tag_uid: string;
  tray_id_name: string;
  tray_info_idx: string;
  tray_type: string;
  tray_sub_brands: string;
  tray_color: string;
  tray_weight: string;
  tray_diameter: string;
  tray_temp: string;
  tray_time: string;
  bed_temp_type: string;
  bed_temp: string;
  nozzle_temp_max: string;
  nozzle_temp_min: string;
  xcam_info: string;
  tray_uuid: string;
  remain: number;
  k: number;
  n: number;
}

export interface PrintLightsReport {
  node: string;
  mode: string;
}

export interface PrintUpgradeState {
  sequence_id?: number;
  progress?: string;
  status?: string;
  consistency_request?: boolean;
  dis_state?: number;
  err_code?: number;
  force_upgrade?: boolean;
  message?: string;
  module?: string;
  new_version_state?: number;
  new_ver_list?: Value[];
}

export interface Info {
  info: InfoData;
}

export interface InfoData {
  command: string;
  sequence_id: string;
  module: InfoModule[];
  result: string;
  reason: string;
}

export interface InfoModule {
  name: string;
  project_name: string;
  sw_ver: string;
  hw_ver: string;
  sn: string;
  loader_ver?: string;
  ota_ver?: string;
}

export interface System {
  system: SystemData;
}

export interface SystemData {
  command: string;
  sequence_id: string;
  access_code?: string;
  result: string;
}
