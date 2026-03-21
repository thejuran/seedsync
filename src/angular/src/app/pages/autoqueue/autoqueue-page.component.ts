import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy} from "@angular/core";
import { AsyncPipe } from "@angular/common";
import {FormsModule} from "@angular/forms";
import {Observable, Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";

import * as Immutable from "immutable";


import {AutoQueueService} from "../../services/autoqueue/autoqueue.service";
import {AutoQueuePattern} from "../../services/autoqueue/autoqueue-pattern";
import {Notification} from "../../services/utils/notification";
import {NotificationService} from "../../services/utils/notification.service";
import {ConnectedService} from "../../services/utils/connected.service";
import {StreamServiceRegistry} from "../../services/base/stream-service.registry";
import {Config} from "../../services/settings/config";
import {ConfigService} from "../../services/settings/config.service";


@Component({
    selector: "app-autoqueue-page",
    templateUrl: "./autoqueue-page.component.html",
    styleUrls: ["./autoqueue-page.component.scss"],
    providers: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [AsyncPipe, FormsModule]
})
export class AutoQueuePageComponent implements OnInit, OnDestroy {

    public patterns: Observable<Immutable.List<AutoQueuePattern>>;
    public newPattern: string;

    public config: Observable<Config>;

    public connected: boolean;
    public enabled: boolean;
    public patternsOnly: boolean;

    private _connectedService: ConnectedService;

    private destroy$ = new Subject<void>();

    constructor(private _changeDetector: ChangeDetectorRef,
                private _autoqueueService: AutoQueueService,
                private _notifService: NotificationService,
                private _configService: ConfigService,
                _streamServiceRegistry: StreamServiceRegistry) {
        this._connectedService = _streamServiceRegistry.connectedService;
        this.patterns = _autoqueueService.patterns;
        this.newPattern = "";
        this.connected = false;
        this.enabled = false;
        this.patternsOnly = false;
    }

    // noinspection JSUnusedGlobalSymbols
    ngOnInit(): void {
        this._connectedService.connected.pipe(takeUntil(this.destroy$)).subscribe({
            next: (connected: boolean) => {
                this.connected = connected;
                if (!this.connected) {
                    // Clear the input box
                    this.newPattern = "";
                }
            }
        });

        this._configService.config.pipe(takeUntil(this.destroy$)).subscribe({
            next: config => {
                if(config != null) {
                    this.enabled = config.autoqueue.enabled;
                    this.patternsOnly = config.autoqueue.patterns_only;
                } else {
                    this.enabled = false;
                    this.patternsOnly = false;
                }
                this._changeDetector.detectChanges();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onAddPattern(): void {
        if (!this.newPattern || !this.enabled || !this.patternsOnly) {
            return;
        }
        this._autoqueueService.add(this.newPattern).subscribe({
            next: reaction => {
                if (reaction.success) {
                    // Clear the input box
                    this.newPattern = "";
                } else {
                    // Show dismissible notification
                    const notif = new Notification({
                        level: Notification.Level.DANGER,
                        dismissible: true,
                        text: reaction.errorMessage
                    });
                    this._notifService.show(notif);
                }
            }
        });
    }

    onRemovePattern(pattern: AutoQueuePattern): void {
        if (!this.enabled || !this.patternsOnly) {
            return;
        }
        this._autoqueueService.remove(pattern.pattern).subscribe({
            next: reaction => {
                if (reaction.success) {
                    // Nothing to do
                } else {
                    // Show dismissible notification
                    const notif = new Notification({
                        level: Notification.Level.DANGER,
                        dismissible: true,
                        text: reaction.errorMessage
                    });
                    this._notifService.show(notif);
                }
            }
        });
    }
}
