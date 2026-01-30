import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from "@angular/core";
import {NgIf, AsyncPipe} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {Observable, Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";

import * as Immutable from "immutable";

import {ViewFileOptionsService} from "../../services/files/view-file-options.service";
import {ViewFileOptions} from "../../services/files/view-file-options";
import {ViewFile} from "../../services/files/view-file";
import {ViewFileService} from "../../services/files/view-file.service";
import {DomService} from "../../services/utils/dom.service";

@Component({
    selector: "app-file-options",
    providers: [],
    templateUrl: "./file-options.component.html",
    styleUrls: ["./file-options.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgIf, AsyncPipe, FormsModule]
})
export class FileOptionsComponent implements OnInit, OnDestroy {
    public ViewFile = ViewFile;
    public ViewFileOptions = ViewFileOptions;

    public options: Observable<ViewFileOptions>;
    public headerHeight: Observable<number>;

    // These track which status filters are enabled
    public isExtractedStatusEnabled = false;
    public isExtractingStatusEnabled = false;
    public isDownloadedStatusEnabled = false;
    public isDownloadingStatusEnabled = false;
    public isQueuedStatusEnabled = false;
    public isStoppedStatusEnabled = false;

    private _latestOptions: ViewFileOptions;
    private destroy$ = new Subject<void>();

    constructor(private _changeDetector: ChangeDetectorRef,
                private viewFileOptionsService: ViewFileOptionsService,
                private _viewFileService: ViewFileService,
                private _domService: DomService) {
        this.options = this.viewFileOptionsService.options;
        this.headerHeight = this._domService.headerHeight;
    }

    ngOnInit() {
        // Use the unfiltered files to enable/disable the filter status buttons
        this._viewFileService.files.pipe(takeUntil(this.destroy$)).subscribe(files => {
            this.isExtractedStatusEnabled = FileOptionsComponent.isStatusEnabled(
                files, ViewFile.Status.EXTRACTED
            );
            this.isExtractingStatusEnabled = FileOptionsComponent.isStatusEnabled(
                files, ViewFile.Status.EXTRACTING
            );
            this.isDownloadedStatusEnabled = FileOptionsComponent.isStatusEnabled(
                files, ViewFile.Status.DOWNLOADED
            );
            this.isDownloadingStatusEnabled = FileOptionsComponent.isStatusEnabled(
                files, ViewFile.Status.DOWNLOADING
            );
            this.isQueuedStatusEnabled = FileOptionsComponent.isStatusEnabled(
                files, ViewFile.Status.QUEUED
            );
            this.isStoppedStatusEnabled = FileOptionsComponent.isStatusEnabled(
                files, ViewFile.Status.STOPPED
            );
            this._changeDetector.detectChanges();
        });

        // Keep the latest options for toggle behaviour implementation
        this.viewFileOptionsService.options.pipe(takeUntil(this.destroy$)).subscribe(options => this._latestOptions = options);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onFilterByName(name: string) {
        this.viewFileOptionsService.setNameFilter(name);
    }

    onFilterByStatus(status: ViewFile.Status) {
        this.viewFileOptionsService.setSelectedStatusFilter(status);
    }

    onSort(sortMethod: ViewFileOptions.SortMethod) {
        this.viewFileOptionsService.setSortMethod(sortMethod);
    }

    onToggleShowDetails(){
        this.viewFileOptionsService.setShowDetails(!this._latestOptions.showDetails);
    }

    onTogglePinFilter() {
        this.viewFileOptionsService.setPinFilter(!this._latestOptions.pinFilter);
    }

    private static isStatusEnabled(files: Immutable.List<ViewFile>, status: ViewFile.Status) {
        return files.findIndex(f => f.status === status) >= 0;
    }
}
