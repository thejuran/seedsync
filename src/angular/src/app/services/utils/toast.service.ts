import {Injectable} from "@angular/core";
import {Subject, Observable} from "rxjs";

export interface Toast {
    message: string;
    type: "success" | "info" | "warning" | "danger";
    autohide: boolean;
    delay: number;  // milliseconds
}

/**
 * ToastService manages ephemeral toast notifications.
 * Toasts are emitted via a Subject and consumed by the app component's
 * toast container. Unlike NotificationService (persistent alerts in header),
 * toasts are transient and auto-dismiss.
 */
@Injectable({providedIn: "root"})
export class ToastService {
    private _toasts$ = new Subject<Toast>();

    get toasts$(): Observable<Toast> {
        return this._toasts$.asObservable();
    }

    show(toast: Partial<Toast> & {message: string}): void {
        this._toasts$.next({
            type: toast.type ?? "info",
            autohide: toast.autohide ?? true,
            delay: toast.delay ?? 5000,
            ...toast
        });
    }

    success(message: string): void {
        this.show({message, type: "success"});
    }

    info(message: string): void {
        this.show({message, type: "info"});
    }

    warning(message: string): void {
        this.show({message, type: "warning"});
    }

    danger(message: string): void {
        this.show({message, type: "danger"});
    }
}
