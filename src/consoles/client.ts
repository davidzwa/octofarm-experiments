import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Responses {
        export type BadRequest = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type Conflict = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type Forbidden = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type InternalServerError = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type NotFound = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type NotImplemented = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type NotModified = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type RequestTimeout = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type ServiceUnavailable = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type Unauthorized = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
        export type UnsupportedMediaType = /* Prusa error message (raw_message) */ Schemas.ResponsePlaintext;
    }
    namespace Schemas {
        export interface Camera {
            /**
             * example:
             * sh42arta
             */
            camera_id?: string;
            config?: {
                /**
                 * example:
                 * /dev/video0
                 */
                path?: string;
                /**
                 * example:
                 * Camera L4D
                 */
                name?: string;
                /**
                 * example:
                 * V4L2
                 */
                driver?: string;
                /**
                 * example:
                 * 1280x720
                 */
                resolution?: string;
            };
            /**
             * Camera is successfully connected to PrusaLink
             */
            connected?: boolean;
            /**
             * Camera is detected by PrusaLink, but not saved yet
             */
            detected?: boolean;
            /**
             * Camera configuration is saved in PrusaLink
             */
            stored?: boolean;
            /**
             * Camera is linked to PrusaConnect
             */
            linked?: boolean;
        }
        /**
         * Camera configuration
         */
        export interface CameraConfig {
            /**
             * Name of the camera
             * example:
             * MuadDib_Camera_1
             */
            name?: string;
            /**
             * When the snapshot is taken
             */
            trigger_scheme?: "TEN_SEC" | "THIRTY_SEC" | "SIXTY_SEC" | "EACH_LAYER" | "FIFTH_LAYER" | "MANUAL";
            available_resolutions?: {
                /**
                 * example:
                 * 640
                 */
                width?: number;
                /**
                 * example:
                 * 480
                 */
                height?: number;
            }[];
            resolution?: {
                /**
                 * example:
                 * 640
                 */
                width?: number;
                /**
                 * example:
                 * 480
                 */
                height?: number;
            };
            /**
             * Focus of the camera (0.0 - 1.0)
             * example:
             * 0.5
             */
            focus?: number;
            capabilities?: ("TRIGGER_SCHEME" | "IMAGING" | "RESOLUTION" | "ROTATION" | "EXPOSURE" | "FOCUS")[];
        }
        /**
         * Camera configuration to set
         */
        export interface CameraConfigSet {
            /**
             * Name of the camera
             * example:
             * MuadDib_Camera_1
             */
            name?: string;
            /**
             * When the snapshot is taken
             */
            trigger_scheme?: "TEN_SEC" | "THIRTY_SEC" | "SIXTY_SEC" | "EACH_LAYER" | "FIFTH_LAYER" | "MANUAL";
            resolution?: {
                /**
                 * example:
                 * 640
                 */
                width?: number;
                /**
                 * example:
                 * 640
                 */
                height?: number;
            };
            /**
             * Current rotation of the output image
             * example:
             * 180
             */
            rotation?: number;
            /**
             * Focus of the camera (0.0 - 1.0)
             * example:
             * 0.5
             */
            focus?: number;
            /**
             * example:
             * 4.2
             */
            exposure?: number;
            /**
             * example:
             * true
             */
            send_to_connect?: boolean;
        }
        export interface Error {
            /**
             * Prusa error code. Must be string if we will have printer with code for example 04
             * example:
             * 10108
             */
            code?: string;
            /**
             * Prusa error text string with prefiled variable macros.
             * example:
             * RESIN TOO LOW
             */
            title: string;
            /**
             * Prusa error text string with prefiled variable macros.
             * example:
             * Measured resin volume 22.4 ml is lower than required for this print. Refill the tank and restart the print.
             */
            text: string;
            /**
             * Link to the Prusa help page
             * example:
             * https://help.prusa3d.com/en/10108/LHE3Q0I1
             */
            url?: string;
        }
        /**
         * Other, not specified files info
         */
        export interface FileInfo {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
            refs?: {
                /**
                 * example:
                 * /api/files/local/file.txt/raw
                 */
                download?: string;
            };
        }
        /**
         * Full firmware file info from the file's detail
         */
        export interface FirmwareFileInfo {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
            refs?: {
                /**
                 * example:
                 * /api/files/local/firmware.hex/raw
                 */
                download?: string;
            };
            meta?: {
                /**
                 * Firmware version in text format
                 */
                version?: string;
                printer_type?: number;
                printer_version?: number;
            };
        }
        /**
         * Simplified firmware file info within the folder's children
         */
        export interface FirmwareFileInfoBasic {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
            refs?: {
                /**
                 * example:
                 * /api/files/local/firmware.hex/raw
                 */
                download?: string;
            };
        }
        /**
         * Info about the folder and its content, except nested children
         */
        export interface FolderInfo {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
            children?: (/* Other, not specified files info */ FileInfo | /* Simplified print file info within the folder's children */ PrintFileInfoBasic | /* Simplified firmware file info within the folder's children */ FirmwareFileInfoBasic | /* Info about the folder and its content, except nested children */ FolderInfo)[];
        }
        /**
         * Basic file info object, common for all files
         */
        export interface GenericFileInfo {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
        }
        export interface Info {
            /**
             * example:
             * false
             */
            mmu?: boolean;
            /**
             * example:
             * MuadDib
             */
            name?: string;
            /**
             * example:
             * Arrakis
             */
            location?: string;
            /**
             * example:
             * false
             */
            farm_mode?: boolean;
            /**
             * example:
             * 0.4
             */
            nozzle_diameter?: number;
            /**
             * example:
             * 170
             */
            min_extrusion_temp?: number;
            /**
             * example:
             * CZPX4720X004XC34242
             */
            serial?: string;
            /**
             * example:
             * true
             */
            sd_ready?: boolean;
            /**
             * example:
             * true
             */
            active_camera?: boolean;
            /**
             * example:
             * prusa-mk3.lan
             */
            hostname?: string;
            /**
             * example:
             * /dev/tty
             */
            port?: string;
            /**
             * example:
             * true
             */
            network_error_chime?: boolean;
        }
        export type Job = JobSerialPrint | JobFilePrint;
        export interface JobFilePrint {
            file?: {
                /**
                 * Short Filename
                 * example:
                 * SPICE~1.gco
                 */
                name: string;
                /**
                 * Long Filename
                 * example:
                 * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
                 */
                display_name?: string;
                /**
                 * example:
                 * /local
                 */
                path: string;
                /**
                 * example:
                 * /PrusaLink gcodes
                 */
                display_path?: string;
                /**
                 * Bytes
                 * example:
                 * 2393142
                 */
                size?: number;
                /**
                 * Timestamp in seconds
                 * example:
                 * 1648042843
                 */
                m_timestamp: number;
                meta?: /* Print file metadata parsed from G-code or SL1, all data are optional */ PrintFileMetadata;
                refs?: /* Reference links for file thumbnail, icon and download */ PrintFileRefs;
            };
        }
        export interface JobSerialPrint {
            /**
             * Whether the printer is printing from the serial line
             */
            serial_print?: boolean;
        }
        /**
         * Full print file info from the file's detail
         */
        export interface PrintFileInfo {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
            refs?: /* Reference links for file thumbnail, icon and download */ PrintFileRefs;
            meta?: /* Print file metadata parsed from G-code or SL1, all data are optional */ PrintFileMetadata;
        }
        /**
         * Simplified print file info within the folder's children
         */
        export interface PrintFileInfoBasic {
            /**
             * Short Filename
             * example:
             * SPICE~1.gco
             */
            name: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * Available for files only, not for folders
             * example:
             * 424242
             */
            size?: number;
            /**
             * File could be print file, firmware file, other (e.g. configuration) file, or folder
             */
            type: "PRINT_FILE" | "FIRMWARE" | "FILE" | "FOLDER";
            /**
             * Timestamp in seconds
             * example:
             * 1648042843
             */
            m_timestamp: number;
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name?: string;
            refs?: /* Reference links for file thumbnail, icon and download */ PrintFileRefs;
        }
        /**
         * Print file metadata parsed from G-code or SL1, all data are optional
         */
        export interface PrintFileMetadata {
            /**
             * Degrees Celsius
             * example:
             * 60
             */
            bed_temperature?: number;
            "bed_temperature per tool"?: number[];
            /**
             * Nozzle temperature, Degrees Celsius
             * example:
             * 215
             */
            temperature?: number;
            "temperature per tool"?: number[];
            /**
             * Milimeters
             * example:
             * 0
             */
            brim_width?: number;
            /**
             * example:
             * 42m 42s
             */
            "estimated printing time (normal mode)"?: string;
            /**
             * Seconds
             * example:
             * 25421
             */
            estimated_print_time?: number;
            /**
             * example:
             * 42
             */
            faded_layers?: number;
            /**
             * example:
             * 0.57
             */
            "filament cost"?: number;
            "filament cost per tool"?: number[];
            /**
             * example:
             * 12.42
             */
            "filament used [cm3]"?: number;
            "filament used [cm3] per tool"?: number[];
            /**
             * example:
             * 15.42
             */
            "filament used [g]"?: number;
            "filament used [g] per tool"?: number[];
            /**
             * example:
             * 5142.06
             */
            "filament used [mm]"?: number;
            "filament used [mm] per tool"?: number[];
            /**
             * example:
             * PLA
             */
            filament_type?: string;
            "filament_type per tool"?: string[];
            /**
             * Percents
             * example:
             * 20%
             */
            fill_density?: string;
            /**
             * Seconds
             * example:
             * 5
             */
            initial_exposure_time?: number;
            /**
             * Milimeters
             * example:
             * 0.3
             */
            layer_height?: number;
            /**
             * example:
             * PLA Sandstorm Orange
             */
            material_name?: string;
            /**
             * Seconds
             * example:
             * 2
             */
            exposure_time?: number;
            /**
             * Seconds
             * example:
             * 3
             */
            max_exposure_time?: number;
            /**
             * Seconds
             * example:
             * 3
             */
            max_initial_exposure_time?: number;
            /**
             * Seconds
             * example:
             * 3
             */
            min_exposure_time?: number;
            /**
             * Seconds
             * example:
             * 1
             */
            min_initial_exposure_time?: number;
            /**
             * Milimeters
             * example:
             * 0.4
             */
            nozzle_diameter?: number;
            "nozzle_diameter per tool"?: number[];
            /**
             * example:
             * true
             */
            normal_percent_present?: boolean;
            /**
             * example:
             * true
             */
            normal_left_present?: boolean;
            /**
             * example:
             * true
             */
            quiet_percent_present?: boolean;
            /**
             * example:
             * true
             */
            quiet_left_present?: boolean;
            /**
             * example:
             * true
             */
            layer_info_present?: boolean;
            /**
             * example:
             * 4.2
             */
            max_layer_z?: number;
            /**
             * Seconds
             * example:
             * 2542
             */
            print_time?: number;
            printer_model?: "MK3" | "MK3S" | "MINI";
            /**
             * example:
             * PLA
             */
            support_material?: string;
            /**
             * example:
             * 0
             */
            ironing?: number;
            /**
             * example:
             * 124.2
             */
            required_resin_ml?: number;
            /**
             * example:
             * ultra_fast
             */
            profile?: string;
        }
        /**
         * Reference links for file thumbnail, icon and download
         */
        export interface PrintFileRefs {
            /**
             * example:
             * /api/files/local/examples/Spice_Harvester_0.3mm_PLA_MK3S_42m.gcode/raw
             */
            download?: string;
            /**
             * example:
             * /api/thumbnails/local/examples/Spice_Harvester_0.3mm_PLA_MK3S_42m.gcode.small.png
             */
            icon?: string;
            /**
             * example:
             * /api/thumbnails/local/examples/Spice_Harvester_0.3mm_PLA_MK3S_42m.gcode.orig.png
             */
            thumbnail?: string;
        }
        /**
         * PrusaLink package version available to update
         */
        export interface PrusaLinkPackage {
            /**
             * Package version available for update
             * example:
             * 4.2-RC1
             */
            new_version?: string;
        }
        /**
         * Prusa error message (raw_message)
         */
        export type ResponsePlaintext = string;
        /**
         * Telemetry info about default working camera, if available
         */
        export interface StatusCamera {
            /**
             * example:
             * Ba1kmCbifTa8X
             */
            id?: string;
        }
        /**
         * Telemetry info about current job, all values are optional
         */
        export interface StatusJob {
            /**
             * example:
             * 420
             */
            id?: number;
            /**
             * Percents
             * example:
             * 42
             */
            progress?: number;
            /**
             * Seconds
             * example:
             * 520
             */
            time_remaining?: number;
            /**
             * Seconds
             * example:
             * 526
             */
            time_printing?: number;
        }
        /**
         * Telemetry info about printer, all values except state are optional
         */
        export interface StatusPrinter {
            state: "IDLE" | "BUSY" | "PRINTING" | "PAUSED" | "FINISHED" | "STOPPED" | "ERROR" | "ATTTENTION" | "READY";
            /**
             * example:
             * 214.9
             */
            temp_nozzle?: number;
            /**
             * example:
             * 215
             */
            target_nozzle?: number;
            /**
             * example:
             * 59.5
             */
            temp_bed?: number;
            /**
             * example:
             * 60
             */
            target_bed?: number;
            /**
             * Available only when printer is not moving
             * example:
             * 23.2
             */
            axis_x?: number;
            /**
             * Available only when printer is not moving
             * example:
             * 24.3
             */
            axis_y?: number;
            /**
             * example:
             * 0.5
             */
            axis_z?: number;
            /**
             * example:
             * 95
             */
            flow?: number;
            /**
             * example:
             * 100
             */
            speed?: number;
            /**
             * example:
             * 420
             */
            fan_hotend?: number;
            /**
             * example:
             * 420
             */
            fan_print?: number;
            status_printer?: {
                /**
                 * example:
                 * true
                 */
                ok?: boolean;
                /**
                 * example:
                 * OK
                 */
                message?: string;
            };
            status_connect?: {
                /**
                 * example:
                 * true
                 */
                ok?: boolean;
                /**
                 * example:
                 * OK
                 */
                message?: string;
            };
        }
        /**
         * Telemetry info about current storage status
         */
        export interface StatusStorage {
            /**
             * example:
             * LOCAL
             */
            name: string;
            /**
             * example:
             * /local
             */
            path: string;
            /**
             * example:
             * false
             */
            read_only: boolean;
            /**
             * example:
             * 4202335
             */
            free_space?: number;
        }
        /**
         * Telemetry info about current transfer status, all values except id and time_transferring are optional
         */
        export interface StatusTransfer {
            /**
             * example:
             * 72855542
             */
            id: number;
            /**
             * example:
             * 30
             */
            time_transferring: number;
            /**
             * Percents
             * example:
             * 65.82
             */
            progress?: number;
            /**
             * example:
             * 123084800
             */
            data_transferred?: number;
        }
        export interface Storage {
            /**
             * Name of the storage, based on selected language
             * example:
             * PrusaLink gcodes
             */
            name?: string;
            /**
             * Storage source
             */
            type: "LOCAL" | "SDCARD" | "USB";
            /**
             * Path to storage (not display path)
             * example:
             * /local
             */
            path: string;
            /**
             * Size of all print files in bytes
             * example:
             * 19216842
             */
            print_files?: number;
            /**
             * Size of all system files in bytes
             * example:
             * 4242
             */
            system_files?: number;
            /**
             * System free space in bytes
             * example:
             * 1921681142
             */
            free_space?: number;
            /**
             * System total space in bytes
             * example:
             * 8589934592
             */
            total_space?: number;
            /**
             * Whether the storage is available or not
             * example:
             * true
             */
            available: boolean;
            /**
             * Whether the storage is read only
             * example:
             * false
             */
            read_only?: boolean;
        }
        export interface Transfer {
            /**
             * example:
             * FROM_WEB
             */
            type: "NO_TRANSFER" | "FROM_WEB" | "FROM_CONNECT" | "FROM_PRINTER" | "FROM_SLICER" | "FROM_CLIENT" | "TO_CONNECT" | "TO_CLIENT";
            /**
             * Long Filename
             * example:
             * Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            display_name: string;
            /**
             * example:
             * /local
             */
            path: string;
            /**
             * example:
             * https://files.printables.com/media/prints/42/gcodes/42_b42-242-442-8142c-424242/spice_harvester_0.3mm_pla_mk3s_12m.gcode
             */
            url?: string;
            /**
             * Bytes
             * example:
             * 239314
             */
            size?: string;
            /**
             * Percents
             * example:
             * 42.25
             */
            progress: number;
            /**
             * Transfered data in bytes
             * example:
             * 3276800
             */
            transferred: number;
            /**
             * Seconds
             * example:
             * 61
             */
            time_remaining?: number;
            /**
             * Seconds
             * example:
             * 42
             */
            time_transferring: number;
            /**
             * Whether or not print after finishing transfer (upload)
             * example:
             * false
             */
            to_print: boolean;
        }
        export interface Version {
            /**
             * example:
             * 1.0.0
             */
            api: string;
            /**
             * example:
             * 0.7.0
             */
            version: string;
            /**
             * example:
             * 1.3.1
             */
            printer: string;
            /**
             * example:
             * PrusaLink 0.7.0
             */
            text: string;
            /**
             * example:
             * 3.10.1-4697
             */
            firmware: string;
            /**
             * example:
             * 0.7.0
             */
            sdk?: string;
            /**
             * Additional capabilities the printer has. The object is expected to
             * be extended in the future with more capabilities. The absence of a
             * capability in the object, or the complete absence of the object
             * means the printer doesn't support such capability (probably doesn't
             * even know such capability might exist).
             *
             */
            capabilities?: {
                /**
                 * The printer supports uploading GCodes by the PUT method (as
                 * described in this document). It is capable of doing the PUT and
                 * HEAD to /api/v1/files/{storage}/{path} and it is capable of
                 * answering the /api/v1/storage endpoint.
                 *
                 * In absence of this capability, client MAY opt to try the legacy
                 * "octoprint" POST to /api/files/{storage}.
                 *
                 */
                "upload-by-put"?: boolean;
            };
        }
    }
}
declare namespace Paths {
    namespace ApiV1Cameras {
        namespace Get {
            namespace Responses {
                export type $200 = Components.Schemas.Camera[];
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        namespace Put {
            export type RequestBody = string[];
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
    }
    namespace ApiV1Cameras$Id {
        namespace Delete {
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        namespace Get {
            namespace Responses {
                export type $200 = /* Camera configuration */ Components.Schemas.CameraConfig;
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        namespace Parameters {
            /**
             * example:
             * Z42D4U2NqEX
             */
            export type Id = string;
        }
        export interface PathParameters {
            id: /**
             * example:
             * Z42D4U2NqEX
             */
            Parameters.Id;
        }
        namespace Post {
            export type RequestBody = /* Camera configuration to set */ Components.Schemas.CameraConfigSet;
            namespace Responses {
                export interface $200 {
                }
                export type $400 = Components.Responses.BadRequest;
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
    }
    namespace ApiV1Cameras$IdConfig {
        namespace Delete {
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        namespace Parameters {
            /**
             * example:
             * Z42D4U2NqEX
             */
            export type Id = string;
        }
        namespace Patch {
            export type RequestBody = /* Camera configuration to set */ Components.Schemas.CameraConfigSet;
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        export interface PathParameters {
            id: /**
             * example:
             * Z42D4U2NqEX
             */
            Parameters.Id;
        }
    }
    namespace ApiV1Cameras$IdConnection {
        namespace Delete {
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        namespace Parameters {
            /**
             * example:
             * Z42D4U2NqEX
             */
            export type Id = string;
        }
        export interface PathParameters {
            id: /**
             * example:
             * Z42D4U2NqEX
             */
            Parameters.Id;
        }
        namespace Post {
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $408 = Components.Responses.RequestTimeout;
                export type $409 = Components.Responses.Conflict;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
    }
    namespace ApiV1Cameras$IdSnap {
        namespace Get {
            namespace Responses {
                export interface $204 {
                }
                export type $304 = Components.Responses.NotModified;
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
        namespace Parameters {
            /**
             * example:
             * Z42D4U2NqEX
             */
            export type Id = string;
        }
        export interface PathParameters {
            id: /**
             * example:
             * Z42D4U2NqEX
             */
            Parameters.Id;
        }
        namespace Post {
            namespace Responses {
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $408 = Components.Responses.RequestTimeout;
                export type $409 = Components.Responses.Conflict;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
    }
    namespace ApiV1CamerasSnap {
        namespace Get {
            namespace Responses {
                export interface $204 {
                }
                export type $304 = Components.Responses.NotModified;
                export type $401 = Components.Responses.Unauthorized;
                export type $403 = Components.Responses.Forbidden;
                export type $404 = Components.Responses.NotFound;
                export type $503 = Components.Responses.ServiceUnavailable;
            }
        }
    }
    namespace ApiV1Files$Storage$Path {
        namespace Delete {
            export interface HeaderParameters {
                Force?: /* ?0=False, ?1=True, according RFC8941/3.3.6 */ Parameters.Force;
            }
            namespace Parameters {
                /**
                 * ?0=False, ?1=True, according RFC8941/3.3.6
                 */
                export type Force = "?0" | "?1";
            }
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
        namespace Get {
            namespace Responses {
                export type $200 = /* Other, not specified files info */ Components.Schemas.FileInfo | /* Full print file info from the file's detail */ Components.Schemas.PrintFileInfo | /* Full firmware file info from the file's detail */ Components.Schemas.FirmwareFileInfo | /* Info about the folder and its content, except nested children */ Components.Schemas.FolderInfo;
                export type $401 = Components.Responses.Unauthorized;
            }
        }
        namespace Head {
            namespace Responses {
                export interface $200 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
        export interface HeaderParameters {
            "Accept-Language"?: /**
             * example:
             * cs
             */
            Parameters.AcceptLanguage;
            Accept?: Parameters.Accept;
        }
        namespace Parameters {
            export type Accept = string;
            /**
             * example:
             * cs
             */
            export type AcceptLanguage = string;
            /**
             * example:
             * /examples/Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            export type Path = string;
            /**
             * example:
             * /local
             */
            export type Storage = string;
        }
        export interface PathParameters {
            storage: /**
             * example:
             * /local
             */
            Parameters.Storage;
            path: /**
             * example:
             * /examples/Spice_Harvester_0.3mm_PLA_MK3S_12m.gcode
             */
            Parameters.Path;
        }
        namespace Post {
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
        namespace Put {
            export interface HeaderParameters {
                "Content-Length"?: /**
                 * example:
                 * 101342
                 */
                Parameters.ContentLength;
                "Content-Type"?: Parameters.ContentType;
                "Print-After-Upload"?: /* ?0=False, ?1=True, according RFC8941/3.3.6 */ Parameters.PrintAfterUpload;
                Overwrite?: /* ?0=False, ?1=True, according RFC8941/3.3.6 */ Parameters.Overwrite;
            }
            namespace Parameters {
                /**
                 * example:
                 * 101342
                 */
                export type ContentLength = number;
                export type ContentType = string;
                /**
                 * ?0=False, ?1=True, according RFC8941/3.3.6
                 */
                export type Overwrite = "?0" | "?1";
                /**
                 * ?0=False, ?1=True, according RFC8941/3.3.6
                 */
                export type PrintAfterUpload = "?0" | "?1";
            }
            export type RequestBody = string; // binary
            namespace Responses {
                export interface $201 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
    }
    namespace ApiV1Info {
        namespace Get {
            namespace Responses {
                export type $200 = Components.Schemas.Info;
                export type $401 = Components.Responses.Unauthorized;
            }
        }
    }
    namespace ApiV1Job {
        namespace Get {
            namespace Responses {
                export type $200 = Components.Schemas.Job;
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
            }
        }
    }
    namespace ApiV1Job$Id {
        namespace Delete {
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
        namespace Parameters {
            /**
             * example:
             * 42
             */
            export type Id = number;
        }
        export interface PathParameters {
            id: /**
             * example:
             * 42
             */
            Parameters.Id;
        }
    }
    namespace ApiV1Job$IdContinue {
        namespace Parameters {
            /**
             * example:
             * 42
             */
            export type Id = number;
        }
        export interface PathParameters {
            id: /**
             * example:
             * 42
             */
            Parameters.Id;
        }
        namespace Put {
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
    }
    namespace ApiV1Job$IdPause {
        namespace Parameters {
            /**
             * example:
             * 42
             */
            export type Id = number;
        }
        export interface PathParameters {
            id: /**
             * example:
             * 42
             */
            Parameters.Id;
        }
        namespace Put {
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
    }
    namespace ApiV1Job$IdResume {
        namespace Parameters {
            /**
             * example:
             * 42
             */
            export type Id = number;
        }
        export interface PathParameters {
            id: /**
             * example:
             * 42
             */
            Parameters.Id;
        }
        namespace Put {
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
    }
    namespace ApiV1Status {
        namespace Get {
            namespace Responses {
                export interface $200 {
                    job?: /* Telemetry info about current job, all values are optional */ Components.Schemas.StatusJob;
                    printer: /* Telemetry info about printer, all values except state are optional */ Components.Schemas.StatusPrinter;
                    transfer?: /* Telemetry info about current transfer status, all values except id and time_transferring are optional */ Components.Schemas.StatusTransfer;
                    storage?: /* Telemetry info about current storage status */ Components.Schemas.StatusStorage;
                    camera?: /* Telemetry info about default working camera, if available */ Components.Schemas.StatusCamera;
                }
            }
        }
    }
    namespace ApiV1Storage {
        namespace Get {
            namespace Responses {
                export interface $200 {
                    storage_list?: Components.Schemas.Storage[];
                }
                export type $401 = Components.Responses.Unauthorized;
            }
        }
        export interface HeaderParameters {
            "Accept-Language"?: /**
             * example:
             * cs
             */
            Parameters.AcceptLanguage;
        }
        namespace Parameters {
            /**
             * example:
             * cs
             */
            export type AcceptLanguage = string;
        }
    }
    namespace ApiV1Transfer {
        namespace Get {
            namespace Responses {
                export type $200 = Components.Schemas.Transfer;
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
            }
        }
    }
    namespace ApiV1Transfer$Id {
        namespace Delete {
            namespace Responses {
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $404 = Components.Responses.NotFound;
                export type $409 = Components.Responses.Conflict;
            }
        }
        namespace Parameters {
            /**
             * example:
             * 42
             */
            export type Id = number;
        }
        export interface PathParameters {
            id: /**
             * example:
             * 42
             */
            Parameters.Id;
        }
    }
    namespace ApiV1Update$Env {
        namespace Get {
            namespace Responses {
                export type $200 = /* PrusaLink package version available to update */ Components.Schemas.PrusaLinkPackage;
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $409 = Components.Responses.BadRequest;
            }
        }
        namespace Parameters {
            export type Env = "prusalink";
        }
        export interface PathParameters {
            env: Parameters.Env;
        }
        namespace Post {
            namespace Responses {
                export interface $200 {
                }
                export interface $204 {
                }
                export type $401 = Components.Responses.Unauthorized;
                export type $409 = Components.Responses.BadRequest;
            }
        }
    }
    namespace ApiVersion {
        namespace Get {
            namespace Responses {
                export type $200 = Components.Schemas.Version;
                export type $401 = Components.Responses.Unauthorized;
            }
        }
    }
}

export interface OperationMethods {
}

export interface PathsDictionary {
  ['/api/version']: {
  }
  ['/api/v1/info']: {
  }
  ['/api/v1/status']: {
  }
  ['/api/v1/job']: {
  }
  ['/api/v1/job/{id}']: {
  }
  ['/api/v1/job/{id}/pause']: {
  }
  ['/api/v1/job/{id}/resume']: {
  }
  ['/api/v1/job/{id}/continue']: {
  }
  ['/api/v1/storage']: {
  }
  ['/api/v1/transfer']: {
  }
  ['/api/v1/transfer/{id}']: {
  }
  ['/api/v1/files/{storage}/{path}']: {
  }
  ['/api/v1/cameras']: {
  }
  ['/api/v1/cameras/{id}']: {
  }
  ['/api/v1/cameras/snap']: {
  }
  ['/api/v1/cameras/{id}/snap']: {
  }
  ['/api/v1/cameras/{id}/config']: {
  }
  ['/api/v1/cameras/{id}/connection']: {
  }
  ['/api/v1/update/{env}']: {
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
