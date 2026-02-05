import {Record} from "immutable";

interface INotification {
    level: Notification.Level;
    text: string;
    timestamp: number;
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
    level: Notification.Level;
    text: string;
    timestamp: number;
    dismissible: boolean;

    constructor(props) {
        props.timestamp = Date.now();

        super(props);
    }
}


export namespace Notification {
    export enum Level {
        SUCCESS         = "success",
        INFO            = "info",
        WARNING         = "warning",
        DANGER          = "danger",
    }
}
