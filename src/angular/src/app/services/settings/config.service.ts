import {Injectable, OnDestroy} from "@angular/core";
import {Observable, BehaviorSubject} from "rxjs";
import {takeUntil} from "rxjs/operators";

import {Config, IConfig} from "./config";
import {LoggerService} from "../utils/logger.service";
import {BaseWebService} from "../base/base-web.service";
import {Localization} from "../../common/localization";
import {StreamServiceRegistry} from "../base/stream-service.registry";
import {RestService, WebReaction} from "../utils/rest.service";


/**
 * ConfigService provides the store for the config
 */
@Injectable()
export class ConfigService extends BaseWebService implements OnDestroy {
    private readonly CONFIG_GET_URL = "/server/config/get";

    // noinspection UnterminatedStatementJS
    private readonly CONFIG_SET_URL =
        (section, option, value) => `/server/config/set/${section}/${option}/${value}`;

    private _config: BehaviorSubject<Config> = new BehaviorSubject(null);

    constructor(_streamServiceProvider: StreamServiceRegistry,
                private _restService: RestService,
                private _logger: LoggerService) {
        super(_streamServiceProvider);
    }

    /**
     * Returns an observable that provides that latest Config
     * @returns {Observable<Config>}
     */
    get config(): Observable<Config> {
        return this._config.asObservable();
    }

    /**
     * Sets a value in the config
     * @param {string} section
     * @param {string} option
     * @param value
     * @returns {WebReaction}
     */
    public set(section: string, option: string, value: any): Observable<WebReaction> {
        const valueStr: string = String(value);
        const currentConfig = this._config.getValue();
        if (!currentConfig.has(section as keyof IConfig) ||
            !(currentConfig.get(section as keyof IConfig) as unknown as {has: (key: string) => boolean}).has(option)) {
            return new Observable<WebReaction>(observer => {
                observer.next(new WebReaction(false, null, `Config has no option named ${section}.${option}`));
            });
        } else if (valueStr.length === 0) {
            return new Observable<WebReaction>(observer => {
                observer.next(new WebReaction(
                    false, null, Localization.Notification.CONFIG_VALUE_BLANK(section, option))
                );
            });
        } else {
            // Double-encode the value
            const valueEncoded = encodeURIComponent(encodeURIComponent(valueStr));
            const url = this.CONFIG_SET_URL(section, option, valueEncoded);
            const obs = this._restService.sendRequest(url);
            obs.pipe(takeUntil(this.destroy$)).subscribe({
                next: reaction => {
                    if (reaction.success) {
                        // Update our copy and notify clients
                        const config = this._config.getValue();
                        const newConfig = new Config(config.updateIn([section, option], (_) => value));
                        this._config.next(newConfig);
                    }
                }
            });
            return obs;
        }
    }

    protected onConnected() {
        // Retry the get
        this.getConfig();
    }

    protected onDisconnected() {
        // Send null config
        this._config.next(null);
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
    }

    private getConfig() {
        this._logger.debug("Getting config...");
        this._restService.sendRequest(this.CONFIG_GET_URL).pipe(takeUntil(this.destroy$)).subscribe({
            next: reaction => {
                if (reaction.success) {
                    const config_json: IConfig = JSON.parse(reaction.data);
                    this._config.next(new Config(config_json));
                } else {
                    this._config.next(null);
                }
            }
        });
    }
}

/**
 * ConfigService factory and provider
 */
export const configServiceFactory = (
    _streamServiceRegistry: StreamServiceRegistry,
    _restService: RestService,
    _logger: LoggerService
) => {
  const configService = new ConfigService(_streamServiceRegistry, _restService, _logger);
  configService.onInit();
  return configService;
};

// noinspection JSUnusedGlobalSymbols
export const ConfigServiceProvider = {
    provide: ConfigService,
    useFactory: configServiceFactory,
    deps: [StreamServiceRegistry, RestService, LoggerService]
};
