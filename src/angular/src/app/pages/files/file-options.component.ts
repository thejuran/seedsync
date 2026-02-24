import {ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit} from "@angular/core";
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

interface BootstrapDropdown {
    getInstance(element: Element): { hide: () => void } | null;
}
declare const bootstrap: {
    Dropdown: BootstrapDropdown;
};

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

    public latestOptions: ViewFileOptions = null;
    public headerHeight: Observable<number>;

    // These track which status filters are enabled
    public isExtractedStatusEnabled = false;
    public isExtractingStatusEnabled = false;
    public isDownloadedStatusEnabled = false;
    public isDownloadingStatusEnabled = false;
    public isQueuedStatusEnabled = false;
    public isStoppedStatusEnabled = false;

    // Status count tracking
    public statusCounts: Map<ViewFile.Status | null, number> = new Map();
    private numberFormatter = new Intl.NumberFormat();
    private _latestFiles: Immutable.List<ViewFile> = Immutable.List();

    private destroy$ = new Subject<void>();

    private scrollHandler = (): void => {
        const openToggles = document.querySelectorAll(".dropdown-toggle.show");
        openToggles.forEach(toggle => {
            const dropdownInstance = bootstrap.Dropdown.getInstance(toggle);
            if (dropdownInstance) {
                dropdownInstance.hide();
            }
        });
    };

    private statusDropdownShowHandler = (): void => {
        this.statusCounts = this.computeStatusCounts(this._latestFiles);
        this._changeDetector.detectChanges();
    };

    constructor(private _changeDetector: ChangeDetectorRef,
                private viewFileOptionsService: ViewFileOptionsService,
                private _viewFileService: ViewFileService,
                private _domService: DomService,
                private _ngZone: NgZone) {
        this.headerHeight = this._domService.headerHeight;
    }

    ngOnInit(): void {
        // Use the unfiltered files to enable/disable the filter status buttons
        this._viewFileService.files.pipe(takeUntil(this.destroy$)).subscribe(files => {
            // Store latest files reference for on-demand count computation
            this._latestFiles = files;

            // Compute initial counts so button shows count before first dropdown open
            this.statusCounts = this.computeStatusCounts(files);

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

        // Keep the latest options for template and toggle behaviour implementation
        this.viewFileOptionsService.options.pipe(takeUntil(this.destroy$)).subscribe(options => {
            this.latestOptions = options;
            this._changeDetector.detectChanges();
        });

        // Close dropdowns on scroll to prevent orphaned menus
        this._ngZone.runOutsideAngular(() => {
            window.addEventListener("scroll", this.scrollHandler, { passive: true });
        });

        // Add Bootstrap dropdown event listener for on-demand count refresh
        this._ngZone.runOutsideAngular(() => {
            const statusDropdown = document.getElementById("filter-status");
            if (statusDropdown) {
                statusDropdown.addEventListener("show.bs.dropdown", this.statusDropdownShowHandler);
            }
        });
    }

    ngOnDestroy(): void {
        window.removeEventListener("scroll", this.scrollHandler);
        const statusDropdown = document.getElementById("filter-status");
        if (statusDropdown) {
            statusDropdown.removeEventListener("show.bs.dropdown", this.statusDropdownShowHandler);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    onFilterByName(name: string): void {
        this.viewFileOptionsService.setNameFilter(name);
    }

    onFilterByStatus(status: ViewFile.Status): void {
        this.viewFileOptionsService.setSelectedStatusFilter(status);
    }

    onSort(sortMethod: ViewFileOptions.SortMethod): void {
        this.viewFileOptionsService.setSortMethod(sortMethod);
    }

    /**
     * Get count for a specific status (or null for "All")
     * Used for disabled state checks in template
     */
    public getCount(status: ViewFile.Status | null): number {
        return this.statusCounts.get(status) ?? 0;
    }

    /**
     * Format count with thousands separator
     * Used in template interpolation
     */
    public formatCount(status: ViewFile.Status | null): string {
        const count = this.getCount(status);
        return this.numberFormatter.format(count);
    }

    /**
     * Compute status counts from file list
     * Single-pass approach for efficiency
     */
    private computeStatusCounts(files: Immutable.List<ViewFile>): Map<ViewFile.Status | null, number> {
        const counts = new Map<ViewFile.Status | null, number>();

        // Initialize "All" count
        counts.set(null, files.size);

        // Initialize all status counts to 0
        Object.values(ViewFile.Status).forEach(status => {
            counts.set(status, 0);
        });

        // Single pass to count files by status
        files.forEach(file => {
            const currentCount = counts.get(file.status) ?? 0;
            counts.set(file.status, currentCount + 1);
        });

        return counts;
    }

    private static isStatusEnabled(files: Immutable.List<ViewFile>, status: ViewFile.Status): boolean {
        return files.findIndex(f => f.status === status) >= 0;
    }
}
