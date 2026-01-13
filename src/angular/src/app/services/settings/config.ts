import { Record } from 'immutable';

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
  debug: null,
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
  port: null,
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
  general: IGeneral;
  lftp: ILftp;
  controller: IController;
  web: IWeb;
  autoqueue: IAutoQueue;
}
const DefaultConfig: IConfig = {
  general: DefaultGeneral,
  lftp: DefaultLftp,
  controller: DefaultController,
  web: DefaultWeb,
  autoqueue: DefaultAutoQueue,
};
const ConfigRecord = Record(DefaultConfig);

export class Config extends ConfigRecord implements IConfig {
  declare general: IGeneral;
  declare lftp: ILftp;
  declare controller: IController;
  declare web: IWeb;
  declare autoqueue: IAutoQueue;

  constructor(props: Partial<IConfig>) {
    // Create immutable members
    super({
      general: GeneralRecord(props.general || {}),
      lftp: LftpRecord(props.lftp || {}),
      controller: ControllerRecord(props.controller || {}),
      web: WebRecord(props.web || {}),
      autoqueue: AutoQueueRecord(props.autoqueue || {}),
    });
  }
}
