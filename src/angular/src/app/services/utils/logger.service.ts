import {Injectable} from "@angular/core";

@Injectable()
export class LoggerService {

    public level: LoggerService.Level;

    constructor() {
        this.level = LoggerService.Level.DEBUG;
    }

    get debug() {
        if (this.level >= LoggerService.Level.DEBUG) {
            return console.debug.bind(console);
        } else {
            // No-op when debug logging is disabled
            return () => { /* Logging disabled at this level */ };
        }
    }

    get info() {
        if (this.level >= LoggerService.Level.INFO) {
            return console.log.bind(console);
        } else {
            // No-op when info logging is disabled
            return () => { /* Logging disabled at this level */ };
        }
    }

    // noinspection JSUnusedGlobalSymbols
    get warn() {
        if (this.level >= LoggerService.Level.WARN) {
            return console.warn.bind(console);
        } else {
            // No-op when warn logging is disabled
            return () => { /* Logging disabled at this level */ };
        }
    }

    get error() {
        if (this.level >= LoggerService.Level.ERROR) {
            return console.error.bind(console);
        } else {
            // No-op when error logging is disabled
            return () => { /* Logging disabled at this level */ };
        }
    }
}

export namespace LoggerService {
    export enum Level {
        ERROR,
        WARN,
        INFO,
        DEBUG,
    }
}
