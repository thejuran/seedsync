import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { StreamServiceRegistryProvider } from './services/base/stream-service.registry';
import { ConfigServiceProvider } from './services/settings/config.service';
import { AutoQueueServiceProvider } from './services/autoqueue/autoqueue.service';
import { ServerCommandServiceProvider } from './services/server/server-command.service';
import { ViewFileFilterService } from './services/files/view-file-filter.service';
import { ViewFileSortService } from './services/files/view-file-sort.service';
import { VersionCheckService } from './services/utils/version-check.service';

// Dummy factory for APP_INITIALIZER
export function dummyFactory(_s: any) {
  return () => null;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),

    // Stream services
    StreamServiceRegistryProvider,

    // Web services
    AutoQueueServiceProvider,
    ConfigServiceProvider,
    ServerCommandServiceProvider,

    // Initialize services not tied to any components
    {
      provide: APP_INITIALIZER,
      useFactory: dummyFactory,
      deps: [ViewFileFilterService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: dummyFactory,
      deps: [ViewFileSortService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: dummyFactory,
      deps: [VersionCheckService],
      multi: true,
    },
  ],
};
