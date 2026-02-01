import {Component, ChangeDetectionStrategy, HostListener} from "@angular/core";
import {NgFor, NgIf, AsyncPipe} from "@angular/common";
import {Observable, combineLatest} from "rxjs";
import {map} from "rxjs/operators";

import {List} from "immutable";

import {FileComponent} from "./file.component";
import {SelectionBannerComponent} from "./selection-banner.component";
import {BulkActionsBarComponent} from "./bulk-actions-bar.component";
import {ViewFileService} from "../../services/files/view-file.service";
import {ViewFile} from "../../services/files/view-file";
import {LoggerService} from "../../services/utils/logger.service";
import {ViewFileOptions} from "../../services/files/view-file-options";
import {ViewFileOptionsService} from "../../services/files/view-file-options.service";
import {FileSelectionService} from "../../services/files/file-selection.service";

@Component({
    selector: "app-file-list",
    providers: [],
    templateUrl: "./file-list.component.html",
    styleUrls: ["./file-list.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgFor, NgIf, AsyncPipe, FileComponent, SelectionBannerComponent, BulkActionsBarComponent]
})
export class FileListComponent {
    public files: Observable<List<ViewFile>>;
    public identify = FileListComponent.identify;
    public options: Observable<ViewFileOptions>;

    // Header checkbox state: 'none', 'some', 'all'
    public headerCheckboxState$: Observable<"none" | "some" | "all">;

    // Selection state for banner
    public selectedFiles$: Observable<Set<string>>;
    public selectAllMatchingFilter$: Observable<boolean>;

    // Track last clicked file index for shift+click range selection
    private _lastClickedIndex: number | null = null;
    // Cache of current files list for range selection (updated on each observable emission)
    private _currentFiles: List<ViewFile> = List();

    constructor(private _logger: LoggerService,
                private viewFileService: ViewFileService,
                private viewFileOptionsService: ViewFileOptionsService,
                public fileSelectionService: FileSelectionService) {
        this.files = viewFileService.filteredFiles;
        this.options = this.viewFileOptionsService.options;

        // Selection state observables for banner
        this.selectedFiles$ = this.fileSelectionService.selectedFiles$;
        this.selectAllMatchingFilter$ = this.fileSelectionService.selectAllMatchingFilter$;

        // Keep a cached copy of files for range selection
        this.files.subscribe(files => {
            this._currentFiles = files;
            // Reset last clicked index if it's now out of range
            if (this._lastClickedIndex !== null && this._lastClickedIndex >= files.size) {
                this._lastClickedIndex = null;
            }
        });

        // Calculate header checkbox state based on selection and visible files
        this.headerCheckboxState$ = combineLatest([
            this.files,
            this.fileSelectionService.selectedFiles$
        ]).pipe(
            map(([files, selectedFiles]) => {
                if (files.size === 0 || selectedFiles.size === 0) {
                    return "none";
                }
                const visibleSelectedCount = files.filter(f => selectedFiles.has(f.name)).size;
                if (visibleSelectedCount === 0) {
                    return "none";
                } else if (visibleSelectedCount === files.size) {
                    return "all";
                } else {
                    return "some";
                }
            })
        );
    }

    // =========================================================================
    // Keyboard Shortcuts
    // =========================================================================

    /**
     * Handle Ctrl/Cmd+A to select all visible files.
     * Handle Escape to clear selection.
     */
    @HostListener("document:keydown", ["$event"])
    onKeyDown(event: KeyboardEvent): void {
        // Ctrl/Cmd+A: Select all visible files
        if ((event.ctrlKey || event.metaKey) && event.key === "a") {
            // Only handle if not in an input/textarea
            if (!this._isInputElement(event.target)) {
                event.preventDefault();
                this.fileSelectionService.selectAllVisible(this._currentFiles.toArray());
            }
        }

        // Escape: Clear selection
        if (event.key === "Escape") {
            if (!this._isInputElement(event.target)) {
                this.fileSelectionService.clearSelection();
                this._lastClickedIndex = null;
            }
        }
    }

    /**
     * Check if the event target is an input element where we shouldn't intercept shortcuts.
     */
    private _isInputElement(target: EventTarget | null): boolean {
        if (!target) {
            return false;
        }
        const tagName = (target as HTMLElement).tagName?.toLowerCase();
        return tagName === "input" || tagName === "textarea" || tagName === "select";
    }

    // noinspection JSUnusedLocalSymbols
    /**
     * Used for trackBy in ngFor
     * @param index
     * @param item
     */
    static identify(index: number, item: ViewFile): string {
        return item.name;
    }

    onSelect(file: ViewFile): void {
        if (file.isSelected) {
            this.viewFileService.unsetSelected();
        } else {
            this.viewFileService.setSelected(file);
        }
    }

    onQueue(file: ViewFile) {
        this.viewFileService.queue(file).subscribe(data => {
            this._logger.info(data);
        });
    }

    onStop(file: ViewFile) {
        this.viewFileService.stop(file).subscribe(data => {
            this._logger.info(data);
        });
    }

    onExtract(file: ViewFile) {
        this.viewFileService.extract(file).subscribe(data => {
            this._logger.info(data);
        });
    }

    onDeleteLocal(file: ViewFile) {
        this.viewFileService.deleteLocal(file).subscribe(data => {
            this._logger.info(data);
        });
    }

    onDeleteRemote(file: ViewFile) {
        this.viewFileService.deleteRemote(file).subscribe(data => {
            this._logger.info(data);
        });
    }

    // =========================================================================
    // Bulk Selection Methods
    // =========================================================================

    /**
     * Check if a file is bulk-selected (for checkbox state).
     */
    isBulkSelected(file: ViewFile): boolean {
        return this.fileSelectionService.isSelected(file.name);
    }

    /**
     * Handle header checkbox click.
     * If none or some selected: select all visible.
     * If all selected: deselect all.
     */
    onHeaderCheckboxClick(files: List<ViewFile>): void {
        const selectedFiles = this.fileSelectionService.getSelectedFiles();
        const visibleSelectedCount = files.filter(f => selectedFiles.has(f.name)).size;

        if (visibleSelectedCount === files.size && files.size > 0) {
            // All visible are selected - clear selection
            this.fileSelectionService.clearSelection();
        } else {
            // None or some selected - select all visible
            this.fileSelectionService.selectAllVisible(files.toArray());
        }
    }

    /**
     * Handle "Select all matching filter" from banner.
     */
    onSelectAllMatchingFilter(files: List<ViewFile>): void {
        this.fileSelectionService.selectAllMatchingFilter(files.toArray());
    }

    /**
     * Handle "Clear" from banner.
     */
    onClearSelection(): void {
        this.fileSelectionService.clearSelection();
        this._lastClickedIndex = null;
    }

    /**
     * Handle checkbox toggle with support for shift+click range selection.
     * @param event The event containing the file and shift key state
     */
    onCheckboxToggle(event: {file: ViewFile, shiftKey: boolean}): void {
        const currentIndex = this._currentFiles.findIndex(f => f.name === event.file.name);

        if (event.shiftKey && this._lastClickedIndex !== null && currentIndex !== -1) {
            // Shift+click: select range from last clicked to current
            const start = Math.min(this._lastClickedIndex, currentIndex);
            const end = Math.max(this._lastClickedIndex, currentIndex);

            // Get file names in range
            const rangeNames: string[] = [];
            for (let i = start; i <= end; i++) {
                const file = this._currentFiles.get(i);
                if (file) {
                    rangeNames.push(file.name);
                }
            }

            // Replace selection with range
            this.fileSelectionService.setSelection(rangeNames);
        } else {
            // Normal click: toggle the single file
            this.fileSelectionService.toggle(event.file.name);
            // Update last clicked index for future range selections
            if (currentIndex !== -1) {
                this._lastClickedIndex = currentIndex;
            }
        }
    }

    // =========================================================================
    // Bulk Action Handlers
    // =========================================================================

    /**
     * Handle bulk Queue action.
     * @param fileNames Array of file names to queue
     */
    onBulkQueue(fileNames: string[]): void {
        this._logger.info(`Bulk queue requested for ${fileNames.length} files:`, fileNames);
        // API call will be implemented in Session 9
    }

    /**
     * Handle bulk Stop action.
     * @param fileNames Array of file names to stop
     */
    onBulkStop(fileNames: string[]): void {
        this._logger.info(`Bulk stop requested for ${fileNames.length} files:`, fileNames);
        // API call will be implemented in Session 9
    }

    /**
     * Handle bulk Extract action.
     * @param fileNames Array of file names to extract
     */
    onBulkExtract(fileNames: string[]): void {
        this._logger.info(`Bulk extract requested for ${fileNames.length} files:`, fileNames);
        // API call will be implemented in Session 9
    }

    /**
     * Handle bulk Delete Local action.
     * @param fileNames Array of file names to delete locally
     */
    onBulkDeleteLocal(fileNames: string[]): void {
        this._logger.info(`Bulk delete local requested for ${fileNames.length} files:`, fileNames);
        // API call will be implemented in Session 9
    }

    /**
     * Handle bulk Delete Remote action.
     * @param fileNames Array of file names to delete remotely
     */
    onBulkDeleteRemote(fileNames: string[]): void {
        this._logger.info(`Bulk delete remote requested for ${fileNames.length} files:`, fileNames);
        // API call will be implemented in Session 9
    }

}
