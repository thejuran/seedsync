import {Injectable} from "@angular/core";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {Observable} from "rxjs";
import {shareReplay} from "rxjs/operators";

import {LoggerService} from "./logger.service";


/**
 * WebReaction encapsulates the response for an action
 * executed on a BaseWebService
 */
export class WebReaction {
    readonly success: boolean;
    readonly data: string | null;
    readonly errorMessage: string | null;

    constructor(success: boolean, data: string | null, errorMessage: string | null) {
        this.success = success;
        this.data = data;
        this.errorMessage = errorMessage;
    }
}


/**
 * RestService exposes the HTTP REST API to clients
 */
@Injectable()
export class RestService {

    constructor(private _logger: LoggerService,
                private _http: HttpClient) {
    }

    /**
     * Send backend a request and generate a WebReaction response
     * @param {string} url
     * @returns {Observable<WebReaction>}
     */
    public sendRequest(url: string): Observable<WebReaction> {
        return new Observable<WebReaction>(observer => {
            this._http.get(url, {responseType: "text"})
                .subscribe({
                    next: (data) => {
                        this._logger.debug("%s http response: %s", url, data);
                        observer.next(new WebReaction(true, data, null));
                    },
                    error: (err: HttpErrorResponse) => {
                        let errorMessage: string | null = null;
                        this._logger.debug("%s error: %O", url, err);
                        if (err.error instanceof Event) {
                            errorMessage = err.error.type;
                        } else {
                            errorMessage = err.error;
                        }
                        observer.next(new WebReaction(false, null, errorMessage));
                    }
                });
        }).pipe(shareReplay(1));
        // shareReplay is needed to:
        //      prevent duplicate http requests
        //      share result with those that subscribe after the value was published
        // More info: https://blog.thoughtram.io/angular/2016/06/16/cold-vs-hot-observables.html
    }
}
