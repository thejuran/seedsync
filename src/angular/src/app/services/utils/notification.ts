import { Record } from 'immutable';

export enum NotificationLevel {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
}

interface INotification {
  level: NotificationLevel | null;
  text: string | null;
  timestamp: number | null;
  dismissible: boolean;
}

const DefaultNotification: INotification = {
  level: null,
  text: null,
  timestamp: null,
  dismissible: false,
};

const NotificationRecord = Record(DefaultNotification);

export class Notification extends NotificationRecord implements INotification {
  declare level: NotificationLevel | null;
  declare text: string | null;
  declare timestamp: number | null;
  declare dismissible: boolean;

  constructor(props: Partial<INotification>) {
    super({
      ...props,
      timestamp: Date.now(),
    });
  }
}
