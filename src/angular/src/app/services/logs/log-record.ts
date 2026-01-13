import { Record } from 'immutable';

export enum LogRecordLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * LogRecord immutable
 */
interface ILogRecord {
  time: Date | null;
  level: LogRecordLevel | null;
  loggerName: string | null;
  message: string | null;
  exceptionTraceback: string | null;
}

const DefaultLogRecord: ILogRecord = {
  time: null,
  level: null,
  loggerName: null,
  message: null,
  exceptionTraceback: null,
};

const LogRecordRecord = Record(DefaultLogRecord);

export class LogRecord extends LogRecordRecord implements ILogRecord {
  declare time: Date | null;
  declare level: LogRecordLevel | null;
  declare loggerName: string | null;
  declare message: string | null;
  declare exceptionTraceback: string | null;

  constructor(props: Partial<ILogRecord>) {
    super(props);
  }
}

const levelMapping: { [key: string]: LogRecordLevel } = {
  DEBUG: LogRecordLevel.DEBUG,
  INFO: LogRecordLevel.INFO,
  WARNING: LogRecordLevel.WARNING,
  ERROR: LogRecordLevel.ERROR,
  CRITICAL: LogRecordLevel.CRITICAL,
};

export function logRecordFromJson(json: LogRecordJson): LogRecord {
  return new LogRecord({
    // str -> number, then sec -> ms
    time: new Date(1000 * +json.time),
    level: levelMapping[json.level_name] || LogRecordLevel.INFO,
    loggerName: json.logger_name,
    message: json.message,
    exceptionTraceback: json.exc_tb,
  });
}

/**
 * LogRecord as serialized by the backend.
 * Note: naming convention matches that used in JSON
 */
export interface LogRecordJson {
  time: number;
  level_name: string;
  logger_name: string;
  message: string;
  exc_tb: string;
}
