import {Record} from "immutable";

/**
 * Backend config
 * Note: Naming convention matches that used in the JSON
 */

/*
 * GENERAL
 */
interface IGeneral {
    debug: boolean | null;
}
const DefaultGeneral: IGeneral = {
    debug: null
};
const GeneralRecord = Record(DefaultGeneral);

/*
 * LFTP
 */
interface ILftp {
    remote_address: string | null;
    remote_username: string | null;
    remote_password: string | null;
    remote_port: number | null;
    remote_path: string | null;
    local_path: string | null;
    remote_path_to_scan_script: string | null;
    use_ssh_key: boolean | null;
    num_max_parallel_downloads: number | null;
    num_max_parallel_files_per_download: number | null;
    num_max_connections_per_root_file: number | null;
    num_max_connections_per_dir_file: number | null;
    num_max_total_connections: number | null;
    use_temp_file: boolean | null;
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
    interval_ms_remote_scan: number | null;
    interval_ms_local_scan: number | null;
    interval_ms_downloading_scan: number | null;
    extract_path: string | null;
    use_local_path_as_extract_path: boolean | null;
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
    port: number | null;
}
const DefaultWeb: IWeb = {
    port: null
};
const WebRecord = Record(DefaultWeb);

/*
 * AUTOQUEUE
 */
interface IAutoQueue {
    enabled: boolean | null;
    patterns_only: boolean | null;
    auto_extract: boolean | null;
}
const DefaultAutoQueue: IAutoQueue = {
    enabled: null,
    patterns_only: null,
    auto_extract: null,
};
const AutoQueueRecord = Record(DefaultAutoQueue);



/*
 * CONFIG
 */
export interface IConfig {
    general: IGeneral | null;
    lftp: ILftp | null;
    controller: IController | null;
    web: IWeb | null;
    autoqueue: IAutoQueue | null;

}
const DefaultConfig: IConfig = {
    general: null,
    lftp: null,
    controller: null,
    web: null,
    autoqueue: null,
};
const ConfigRecord = Record(DefaultConfig);


export class Config extends ConfigRecord implements IConfig {
    override general!: IGeneral | null;
    override lftp!: ILftp | null;
    override controller!: IController | null;
    override web!: IWeb | null;
    override autoqueue!: IAutoQueue | null;

    constructor(props: {general?: Partial<IGeneral>; lftp?: Partial<ILftp>; controller?: Partial<IController>; web?: Partial<IWeb>; autoqueue?: Partial<IAutoQueue>}) {
        // Create immutable members
        super({
            general: props.general ? GeneralRecord(props.general) : null,
            lftp: props.lftp ? LftpRecord(props.lftp) : null,
            controller: props.controller ? ControllerRecord(props.controller) : null,
            web: props.web ? WebRecord(props.web) : null,
            autoqueue: props.autoqueue ? AutoQueueRecord(props.autoqueue) : null
        });
    }
}
