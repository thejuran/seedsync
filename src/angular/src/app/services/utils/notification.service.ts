import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import * as Immutable from 'immutable';

import { Notification, NotificationLevel } from './notification';

/**
 * NotificationService manages which notifications are shown or hidden
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications: Immutable.List<Notification> = Immutable.List([]);
  private _notificationsSubject: BehaviorSubject<Immutable.List<Notification>> = new BehaviorSubject(
    this._notifications
  );

  private _comparator = (a: Notification, b: Notification): number => {
    // First sort by level
    if (a.level !== b.level) {
      const statusPriorities: Record<string, number> = {
        [NotificationLevel.DANGER]: 0,
        [NotificationLevel.WARNING]: 1,
        [NotificationLevel.INFO]: 2,
        [NotificationLevel.SUCCESS]: 3,
      };
      if (a.level && b.level && statusPriorities[a.level] !== statusPriorities[b.level]) {
        return statusPriorities[a.level] - statusPriorities[b.level];
      }
    }
    // Then sort by timestamp
    return (b.timestamp || 0) - (a.timestamp || 0);
  };

  constructor() {}

  get notifications(): Observable<Immutable.List<Notification>> {
    return this._notificationsSubject.asObservable();
  }

  public show(notification: Notification) {
    const index = this._notifications.findIndex((value) => Immutable.is(value, notification));
    if (index < 0) {
      const notifications = this._notifications.push(notification);
      this._notifications = notifications.sort(this._comparator).toList();
      this._notificationsSubject.next(this._notifications);
    }
  }

  public hide(notification: Notification) {
    const index = this._notifications.findIndex((value) => Immutable.is(value, notification));
    if (index >= 0) {
      this._notifications = this._notifications.remove(index);
      this._notificationsSubject.next(this._notifications);
    }
  }
}
