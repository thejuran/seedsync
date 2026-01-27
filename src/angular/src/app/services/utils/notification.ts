import {Record} from "immutable";

interface INotification {
    level: Notification.Level | null;
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
    override level!: Notification.Level | null;
    override text!: string | null;
    override timestamp!: number | null;
    override dismissible!: boolean;

    constructor(props: Partial<INotification>) {
        const propsWithTimestamp = {
            ...props,
            timestamp: Date.now()
        };

        super(propsWithTimestamp);
    }
}


export module Notification {
    export enum Level {
        SUCCESS         = <any> "success",
        INFO            = <any> "info",
        WARNING         = <any> "warning",
        DANGER          = <any> "danger",
    }
}
