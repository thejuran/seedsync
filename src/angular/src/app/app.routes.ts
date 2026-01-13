import { Routes } from '@angular/router';
import * as Immutable from 'immutable';

export interface RouteInfo {
  path: string;
  name: string;
  icon: string;
}

export const ROUTE_INFOS: Immutable.List<RouteInfo> = Immutable.List([
  {
    path: 'dashboard',
    name: 'Dashboard',
    icon: 'assets/icons/dashboard.svg',
  },
  {
    path: 'settings',
    name: 'Settings',
    icon: 'assets/icons/settings.svg',
  },
  {
    path: 'autoqueue',
    name: 'AutoQueue',
    icon: 'assets/icons/autoqueue.svg',
  },
  {
    path: 'logs',
    name: 'Logs',
    icon: 'assets/icons/logs.svg',
  },
  {
    path: 'about',
    name: 'About',
    icon: 'assets/icons/about.svg',
  },
]);

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  // Components will be added when ported
];
