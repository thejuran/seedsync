import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { LoggerService } from './logger.service';

/**
 * WebReaction encapsulates the response for an action
 * executed on a BaseWebService
 */
export class WebReaction {
  constructor(
    readonly success: boolean,
    readonly data: string | null,
    readonly errorMessage: string | null
  ) {}
}

/**
 * RestService exposes the HTTP REST API to clients
 */
@Injectable({ providedIn: 'root' })
export class RestService {
  constructor(
    private _logger: LoggerService,
    private _http: HttpClient
  ) {}

  /**
   * Send backend a request and generate a WebReaction response
   */
  public sendRequest(url: string): Observable<WebReaction> {
    return new Observable<WebReaction>((observer) => {
      this._http.get(url, { responseType: 'text' }).subscribe({
        next: (data) => {
          this._logger.debug('%s http response: %s', url, data);
          observer.next(new WebReaction(true, data, null));
        },
        error: (err: HttpErrorResponse) => {
          let errorMessage: string | null = null;
          this._logger.debug('%s error: %O', url, err);
          if (err.error instanceof Event) {
            errorMessage = err.error.type;
          } else {
            errorMessage = err.error;
          }
          observer.next(new WebReaction(false, null, errorMessage));
        },
      });
    }).pipe(
      // shareReplay is needed to:
      //      prevent duplicate http requests
      //      share result with those that subscribe after the value was published
      shareReplay(1)
    );
  }
}
