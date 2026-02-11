import {Record} from "immutable";

/**
 * Backend config
 * Note: Naming convention matches that used in the JSON
 */

/*
 * GENERAL
 */
interface IGeneral {
    debug: boolean;
}
const DefaultGeneral: IGeneral = {
    debug: null
};
const GeneralRecord = Record(DefaultGeneral);

/*
 * LFTP
 */
interface ILftp {
    remote_address: string;
    remote_username: string;
    remote_password: string;
    remote_port: number;
    remote_path: string;
    local_path: string;
    remote_path_to_scan_script: string;
    use_ssh_key: boolean;
    num_max_parallel_downloads: number;
    num_max_parallel_files_per_download: number;
    num_max_connections_per_root_file: number;
    num_max_connections_per_dir_file: number;
    num_max_total_connections: number;
    use_temp_file: boolean;
}
const DefaultLftp: ILftp = {
    remote_address: null,
    remote_username: null,
    remote_password: null,
    remote_port: null,
    remote_path: null,
    local_path: null,
    remote_path_to_scan_script: null,
    use_ssh_key: null,
    num_max_parallel_downloads: null,
    num_max_parallel_files_per_download: null,
    num_max_connections_per_root_file: null,
    num_max_connections_per_dir_file: null,
    num_max_total_connections: null,
    use_temp_file: null,
};
const LftpRecord = Record(DefaultLftp);

/*
 * CONTROLLER
 */
interface IController {
    interval_ms_remote_scan: number;
    interval_ms_local_scan: number;
    interval_ms_downloading_scan: number;
    extract_path: string;
    use_local_path_as_extract_path: boolean;
}
const DefaultController: IController = {
    interval_ms_remote_scan: null,
    interval_ms_local_scan: null,
    interval_ms_downloading_scan: null,
    extract_path: null,
    use_local_path_as_extract_path: null,
};
const ControllerRecord = Record(DefaultController);

/*
 * WEB
 */
interface IWeb {
    port: number;
}
const DefaultWeb: IWeb = {
    port: null
};
const WebRecord = Record(DefaultWeb);

/*
 * AUTOQUEUE
 */
interface IAutoQueue {
    enabled: boolean;
    patterns_only: boolean;
    auto_extract: boolean;
}
const DefaultAutoQueue: IAutoQueue = {
    enabled: null,
    patterns_only: null,
    auto_extract: null,
};
const AutoQueueRecord = Record(DefaultAutoQueue);

/*
 * SONARR
 */
interface ISonarr {
    enabled: boolean;
    sonarr_url: string;
    sonarr_api_key: string;
}
const DefaultSonarr: ISonarr = {
    enabled: null,
    sonarr_url: null,
    sonarr_api_key: null,
};
const SonarrRecord = Record(DefaultSonarr);

/*
 * RADARR
 */
interface IRadarr {
    enabled: boolean;
    radarr_url: string;
    radarr_api_key: string;
}
const DefaultRadarr: IRadarr = {
    enabled: null,
    radarr_url: null,
    radarr_api_key: null,
};
const RadarrRecord = Record(DefaultRadarr);

/*
 * AUTODELETE
 */
interface IAutoDelete {
    enabled: boolean;
    dry_run: boolean;
    delay_seconds: number;
}
const DefaultAutoDelete: IAutoDelete = {
    enabled: null,
    dry_run: null,
    delay_seconds: null,
};
const AutoDeleteRecord = Record(DefaultAutoDelete);

/*
 * CONFIG
 */
export interface IConfig {
    general: IGeneral;
    lftp: ILftp;
    controller: IController;
    web: IWeb;
    autoqueue: IAutoQueue;
    sonarr: ISonarr;
    radarr: IRadarr;
    autodelete: IAutoDelete;
}
const DefaultConfig: IConfig = {
    general: null,
    lftp: null,
    controller: null,
    web: null,
    autoqueue: null,
    sonarr: null,
    radarr: null,
    autodelete: null,
};
const ConfigRecord = Record(DefaultConfig);


export class Config extends ConfigRecord implements IConfig {
    general: IGeneral;
    lftp: ILftp;
    controller: IController;
    web: IWeb;
    autoqueue: IAutoQueue;
    sonarr: ISonarr;
    radarr: IRadarr;
    autodelete: IAutoDelete;

    constructor(props) {
        // Create immutable members
        super({
            general: GeneralRecord(props.general),
            lftp: LftpRecord(props.lftp),
            controller: ControllerRecord(props.controller),
            web: WebRecord(props.web),
            autoqueue: AutoQueueRecord(props.autoqueue),
            sonarr: props.sonarr ? SonarrRecord(props.sonarr) : SonarrRecord(DefaultSonarr),
            radarr: props.radarr ? RadarrRecord(props.radarr) : RadarrRecord(DefaultRadarr),
            autodelete: props.autodelete ? AutoDeleteRecord(props.autodelete) : AutoDeleteRecord(DefaultAutoDelete),
        });
    }
}
