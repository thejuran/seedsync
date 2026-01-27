import {ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER} from '@angular/core';
import {provideRouter, RouteReuseStrategy} from '@angular/router';
import {provideHttpClient, withFetch} from '@angular/common/http';
import {provideAnimations} from '@angular/platform-browser/animations';

import {ROUTES} from './routes';
import {CachedReuseStrategy} from './common/cached-reuse-strategy';
import {LoggerService} from './services/utils/logger.service';
import {NotificationService} from './services/utils/notification.service';
import {RestService} from './services/utils/rest.service';
import {ViewFileService} from './services/files/view-file.service';
import {ViewFileFilterService} from './services/files/view-file-filter.service';
import {ViewFileSortService} from './services/files/view-file-sort.service';
import {ViewFileOptionsService} from './services/files/view-file-options.service';
import {DomService} from './services/utils/dom.service';
import {VersionCheckService} from './services/utils/version-check.service';
import {StreamDispatchService, StreamServiceRegistry} from './services/base/stream-service.registry';
import {ServerStatusService} from './services/server/server-status.service';
import {ModelFileService} from './services/files/model-file.service';
import {ConnectedService} from './services/utils/connected.service';
import {LogService} from './services/logs/log.service';
import {AutoQueueService} from './services/autoqueue/autoqueue.service';
import {ConfigService} from './services/settings/config.service';
import {ServerCommandService} from './services/server/server-command.service';
import {environment} from '../environments/environment';

// Factory to initialize logger level
function initializeLogger(logger: LoggerService) {
  return () => {
    logger.level = environment.logger.level;
    return null;
  };
}

// Factory to initialize services not tied to any components
function dummyFactory(_service: unknown) {
  return () => null;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(ROUTES),
    provideHttpClient(withFetch()),
    provideAnimations(),

    // Custom route reuse strategy
    {provide: RouteReuseStrategy, useClass: CachedReuseStrategy},

    // Core services
    LoggerService,
    NotificationService,
    RestService,
    ViewFileService,
    ViewFileFilterService,
    ViewFileSortService,
    ViewFileOptionsService,
    DomService,
    VersionCheckService,

    // Stream services
    StreamDispatchService,
    StreamServiceRegistry,
    ServerStatusService,
    ModelFileService,
    ConnectedService,
    LogService,

    // Command services
    AutoQueueService,
    ConfigService,
    ServerCommandService,

    // Initialize logger
    {
      provide: APP_INITIALIZER,
      useFactory: initializeLogger,
      deps: [LoggerService],
      multi: true
    },

    // Initialize services not tied to any components
    {
      provide: APP_INITIALIZER,
      useFactory: dummyFactory,
      deps: [ViewFileFilterService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: dummyFactory,
      deps: [ViewFileSortService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: dummyFactory,
      deps: [VersionCheckService],
      multi: true
    }
  ]
};
