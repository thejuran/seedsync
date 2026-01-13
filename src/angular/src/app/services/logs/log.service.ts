import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

import { BaseStreamService } from '../base/base-stream.service';
import { LogRecord, logRecordFromJson } from './log-record';

@Injectable({ providedIn: 'root' })
export class LogService extends BaseStreamService {
  private _logs: ReplaySubject<LogRecord> = new ReplaySubject();

  constructor() {
    super();
    this.registerEventName('log-record');
  }

  /**
   * Logs is a hot observable (i.e. no caching)
   */
  get logs(): Observable<LogRecord> {
    return this._logs.asObservable();
  }

  protected onEvent(eventName: string, data: string) {
    this._logs.next(logRecordFromJson(JSON.parse(data)));
  }

  protected onConnected() {
    // nothing to do
  }

  protected onDisconnected() {
    // nothing to do
  }
}
