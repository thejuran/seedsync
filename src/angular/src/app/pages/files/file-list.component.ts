import {Component, ChangeDetectionStrategy} from "@angular/core";
import {NgFor, NgIf, AsyncPipe} from "@angular/common";
import {Observable, combineLatest} from "rxjs";
import {map} from "rxjs/operators";

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
    imports: [NgFor, NgIf, AsyncPipe, FileComponent]
})
export class FileListComponent {
    public files: Observable<List<ViewFile>>;
    public identify = FileListComponent.identify;
    public options: Observable<ViewFileOptions>;

    // Header checkbox state: 'none', 'some', 'all'
    public headerCheckboxState$: Observable<"none" | "some" | "all">;

    constructor(private _logger: LoggerService,
                private viewFileService: ViewFileService,
                private viewFileOptionsService: ViewFileOptionsService,
                public fileSelectionService: FileSelectionService) {
        this.files = viewFileService.filteredFiles;
        this.options = this.viewFileOptionsService.options;

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

}
