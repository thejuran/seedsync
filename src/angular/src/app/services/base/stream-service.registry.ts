import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

import { ModelFileService } from '../files/model-file.service';
import { ServerStatusService } from '../server/server-status.service';
import { LoggerService } from '../utils/logger.service';
import { ConnectedService } from '../utils/connected.service';
import { LogService } from '../logs/log.service';

export class EventSourceFactory {
  static createEventSource(url: string): EventSource {
    return new EventSource(url);
  }
}

export interface IStreamService {
  /**
   * Returns the event names supported by this stream service
   */
  getEventNames(): string[];

  /**
   * Notifies the stream service that it is now connected
   */
  notifyConnected(): void;

  /**
   * Notifies the stream service that it is now disconnected
   */
  notifyDisconnected(): void;

  /**
   * Notifies the stream service of an event
   */
  notifyEvent(eventName: string, data: string): void;
}

/**
 * StreamDispatchService is the top-level service that connects to
 * the multiplexed SSE stream. It listens for SSE events and dispatches
 * them to whichever IStreamService that requested them.
 */
@Injectable({ providedIn: 'root' })
export class StreamDispatchService {
  private readonly STREAM_URL = '/server/stream';
  private readonly STREAM_RETRY_INTERVAL_MS = 3000;

  private _eventNameToServiceMap: Map<string, IStreamService> = new Map();
  private _services: IStreamService[] = [];

  constructor(
    private _logger: LoggerService,
    private _zone: NgZone
  ) {}

  /**
   * Call this method to finish initialization
   */
  public onInit() {
    this.createSseObserver();
  }

  /**
   * Register an IStreamService with the dispatch
   */
  public registerService(service: IStreamService) {
    for (const eventName of service.getEventNames()) {
      this._eventNameToServiceMap.set(eventName, service);
    }
    this._services.push(service);
    return service;
  }

  private createSseObserver() {
    const observable = new Observable<{ event: string; data: string }>((observer) => {
      const eventSource = EventSourceFactory.createEventSource(this.STREAM_URL);
      for (const eventName of Array.from(this._eventNameToServiceMap.keys())) {
        eventSource.addEventListener(eventName, (event) =>
          observer.next({
            event: eventName,
            data: (event as MessageEvent).data,
          })
        );
      }

      eventSource.onopen = () => {
        this._logger.info('Connected to server stream');

        // Notify all services of connection
        for (const service of this._services) {
          this._zone.run(() => {
            service.notifyConnected();
          });
        }
      };

      eventSource.onerror = (x) => observer.error(x);

      return () => {
        eventSource.close();
      };
    });

    observable.subscribe({
      next: (x) => {
        const eventName = x.event;
        const eventData = x.data;
        this._zone.run(() => {
          this._eventNameToServiceMap.get(eventName)?.notifyEvent(eventName, eventData);
        });
      },
      error: (err) => {
        this._logger.error('Error in stream: %O', err);

        // Notify all services of disconnection
        for (const service of this._services) {
          this._zone.run(() => {
            service.notifyDisconnected();
          });
        }

        setTimeout(() => {
          this.createSseObserver();
        }, this.STREAM_RETRY_INTERVAL_MS);
      },
    });
  }
}

/**
 * StreamServiceRegistry is responsible for initializing all
 * Stream Services. All services created by the registry
 * will be connected to a single stream via the DispatchService
 */
@Injectable({ providedIn: 'root' })
export class StreamServiceRegistry {
  constructor(
    private _dispatch: StreamDispatchService,
    private _modelFileService: ModelFileService,
    private _serverStatusService: ServerStatusService,
    private _connectedService: ConnectedService,
    private _logService: LogService
  ) {
    // Register all services
    _dispatch.registerService(_connectedService);
    _dispatch.registerService(_serverStatusService);
    _dispatch.registerService(_modelFileService);
    _dispatch.registerService(_logService);
  }

  /**
   * Call this method to finish initialization
   */
  public onInit() {
    this._dispatch.onInit();
  }

  get modelFileService(): ModelFileService {
    return this._modelFileService;
  }
  get serverStatusService(): ServerStatusService {
    return this._serverStatusService;
  }
  get connectedService(): ConnectedService {
    return this._connectedService;
  }
  get logService(): LogService {
    return this._logService;
  }
}

/**
 * StreamServiceRegistry factory and provider
 */
export const streamServiceRegistryFactory = (
  _dispatch: StreamDispatchService,
  _modelFileService: ModelFileService,
  _serverStatusService: ServerStatusService,
  _connectedService: ConnectedService,
  _logService: LogService
) => {
  const streamServiceRegistry = new StreamServiceRegistry(
    _dispatch,
    _modelFileService,
    _serverStatusService,
    _connectedService,
    _logService
  );
  streamServiceRegistry.onInit();
  return streamServiceRegistry;
};

export const StreamServiceRegistryProvider = {
  provide: StreamServiceRegistry,
  useFactory: streamServiceRegistryFactory,
  deps: [StreamDispatchService, ModelFileService, ServerStatusService, ConnectedService, LogService],
};
