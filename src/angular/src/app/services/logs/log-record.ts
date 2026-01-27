import {Record} from "immutable";


/**
 * LogRecord immutable
 */
interface ILogRecord {
    time: Date | null;
    level: LogRecord.Level | null;
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
    override time!: Date | null;
    override level!: LogRecord.Level | null;
    override loggerName!: string | null;
    override message!: string | null;
    override exceptionTraceback!: string | null;

    constructor(props: Partial<ILogRecord>) {
        super(props);
    }
}


export module LogRecord {
    export function fromJson(json: LogRecordJson): LogRecord {
        return new LogRecord({
            // str -> number, then sec -> ms
            time: new Date(1000 * +json.time),
            level: LogRecord.Level[json.level_name as keyof typeof LogRecord.Level],
            loggerName: json.logger_name,
            message: json.message,
            exceptionTraceback: json.exc_tb
        });
    }

    export enum Level {
        DEBUG       = <any> "DEBUG",
        INFO        = <any> "INFO",
        WARNING     = <any> "WARNING",
        ERROR       = <any> "ERROR",
        CRITICAL    = <any> "CRITICAL",
    }
}


/**
 * LogRecord as serialized by the backend.
 * Note: naming convention matches that used in JSON
 */
export interface LogRecordJson {
    time: number | string;
    level_name: string;
    logger_name: string;
    message: string;
    exc_tb?: string | null;
}
