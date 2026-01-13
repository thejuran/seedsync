import { Record } from 'immutable';

/**
 * ServerStatus immutable
 */
interface IServerStatus {
  server: {
    up: boolean | null;
    errorMessage: string | null;
  };

  controller: {
    latestLocalScanTime: Date | null;
    latestRemoteScanTime: Date | null;
    latestRemoteScanFailed: boolean | null;
    latestRemoteScanError: string | null;
  };
}

const DefaultServerStatus: IServerStatus = {
  server: {
    up: null,
    errorMessage: null,
  },
  controller: {
    latestLocalScanTime: null,
    latestRemoteScanTime: null,
    latestRemoteScanFailed: null,
    latestRemoteScanError: null,
  },
};

const ServerStatusRecord = Record(DefaultServerStatus);

export class ServerStatus extends ServerStatusRecord implements IServerStatus {
  declare server: {
    up: boolean | null;
    errorMessage: string | null;
  };

  declare controller: {
    latestLocalScanTime: Date | null;
    latestRemoteScanTime: Date | null;
    latestRemoteScanFailed: boolean | null;
    latestRemoteScanError: string | null;
  };

  constructor(props: Partial<IServerStatus>) {
    super(props);
  }
}

export function serverStatusFromJson(json: ServerStatusJson): ServerStatus {
  let latestLocalScanTime: Date | null = null;
  if (json.controller.latest_local_scan_time != null) {
    // str -> number, then sec -> ms
    latestLocalScanTime = new Date(1000 * +json.controller.latest_local_scan_time);
  }

  let latestRemoteScanTime: Date | null = null;
  if (json.controller.latest_remote_scan_time != null) {
    // str -> number, then sec -> ms
    latestRemoteScanTime = new Date(1000 * +json.controller.latest_remote_scan_time);
  }

  return new ServerStatus({
    server: {
      up: json.server.up,
      errorMessage: json.server.error_msg,
    },
    controller: {
      latestLocalScanTime: latestLocalScanTime,
      latestRemoteScanTime: latestRemoteScanTime,
      latestRemoteScanFailed: json.controller.latest_remote_scan_failed,
      latestRemoteScanError: json.controller.latest_remote_scan_error,
    },
  });
}

/**
 * ServerStatus as serialized by the backend.
 * Note: naming convention matches that used in JSON
 */
export interface ServerStatusJson {
  server: {
    up: boolean;
    error_msg: string;
  };

  controller: {
    latest_local_scan_time: string;
    latest_remote_scan_time: string;
    latest_remote_scan_failed: boolean;
    latest_remote_scan_error: string;
  };
}
