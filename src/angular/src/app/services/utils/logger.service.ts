import { Injectable } from '@angular/core';

export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  public level: LogLevel = LogLevel.DEBUG;

  get debug() {
    if (this.level >= LogLevel.DEBUG) {
      return console.debug.bind(console);
    } else {
      return () => {};
    }
  }

  get info() {
    if (this.level >= LogLevel.INFO) {
      return console.log.bind(console);
    } else {
      return () => {};
    }
  }

  get warn() {
    if (this.level >= LogLevel.WARN) {
      return console.warn.bind(console);
    } else {
      return () => {};
    }
  }

  get error() {
    if (this.level >= LogLevel.ERROR) {
      return console.error.bind(console);
    } else {
      return () => {};
    }
  }
}
