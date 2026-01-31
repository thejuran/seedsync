import {Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy} from "@angular/core";
import {NgFor, AsyncPipe} from "@angular/common";
import {Observable, Subject, combineLatest} from "rxjs";
import {takeUntil} from "rxjs/operators";

import {List} from "immutable";

import {FileComponent} from "./file.component";
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
    imports: [NgFor, AsyncPipe, FileComponent]
})
export class FileListComponent implements OnInit, OnDestroy {
    public files: Observable<List<ViewFile>>;
    public identify = FileListComponent.identify;
    public options: Observable<ViewFileOptions>;

    // Header checkbox state: "unchecked" | "checked" | "indeterminate"
    public headerCheckboxState: "unchecked" | "checked" | "indeterminate" = "unchecked";

    // Current selected files set (for checkbox binding)
    public selectedFiles: Set<string> = new Set();

    private destroy$ = new Subject<void>();
    private currentFiles: List<ViewFile> = List();

    constructor(private _logger: LoggerService,
                private viewFileService: ViewFileService,
                private viewFileOptionsService: ViewFileOptionsService,
                private fileSelectionService: FileSelectionService,
                private cdr: ChangeDetectorRef) {
        this.files = viewFileService.filteredFiles;
        this.options = this.viewFileOptionsService.options;
    }

    ngOnInit(): void {
        // Track current files and update header checkbox state
        combineLatest([
            this.viewFileService.filteredFiles,
            this.fileSelectionService.selectedFiles$
        ]).pipe(takeUntil(this.destroy$)).subscribe(([files, selectedFiles]) => {
            this.currentFiles = files;
            this.selectedFiles = selectedFiles;
            this.updateHeaderCheckboxState(files, selectedFiles);
            this.cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private updateHeaderCheckboxState(files: List<ViewFile>, selectedFiles: Set<string>): void {
        if (files.size === 0 || selectedFiles.size === 0) {
            this.headerCheckboxState = "unchecked";
        } else {
            const visibleSelectedCount = files.filter(f => selectedFiles.has(f.name)).size;
            if (visibleSelectedCount === 0) {
                this.headerCheckboxState = "unchecked";
            } else if (visibleSelectedCount === files.size) {
                this.headerCheckboxState = "checked";
            } else {
                this.headerCheckboxState = "indeterminate";
            }
        }
    }

    onHeaderCheckboxChange(event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        if (checkbox.checked) {
            // Select all visible files
            const visibleFileNames = this.currentFiles.map(f => f.name).toArray();
            this.fileSelectionService.selectAllVisible(visibleFileNames);
        } else {
            // Deselect all
            this.fileSelectionService.clearSelection();
        }
    }

    /**
     * Handle checkbox toggle for a file row
     */
    onCheckboxToggle(file: ViewFile): void {
        this.fileSelectionService.toggle(file.name);
    }

    /**
     * Check if a file is currently checked (selected for bulk action)
     */
    isFileChecked(file: ViewFile): boolean {
        return this.selectedFiles.has(file.name);
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
}
