import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {map} from "rxjs/operators";

/**
 * FileSelectionService manages the selection state of files for bulk operations.
 * It tracks which files are selected by name using a Set for O(1) lookup.
 */
@Injectable({
    providedIn: "root"
})
export class FileSelectionService {
    // Set of selected file names
    private _selectedFiles: Set<string> = new Set();
    private _selectedFilesSubject = new BehaviorSubject<Set<string>>(new Set());

    // Flag indicating if "select all matching filter" is active
    private _selectAllMatching = false;
    private _selectAllMatchingSubject = new BehaviorSubject<boolean>(false);

    /**
     * Observable of the current selection set
     */
    get selectedFiles$(): Observable<Set<string>> {
        return this._selectedFilesSubject.asObservable();
    }

    /**
     * Observable of selected file count
     */
    get selectedCount$(): Observable<number> {
        return this._selectedFilesSubject.pipe(
            map(files => files.size)
        );
    }

    /**
     * Observable of whether any files are selected
     */
    get hasSelection$(): Observable<boolean> {
        return this._selectedFilesSubject.pipe(
            map(files => files.size > 0)
        );
    }

    /**
     * Observable of the "select all matching" flag
     */
    get selectAllMatching$(): Observable<boolean> {
        return this._selectAllMatchingSubject.asObservable();
    }

    /**
     * Select a single file by name
     */
    select(fileName: string): void {
        if (!this._selectedFiles.has(fileName)) {
            this._selectedFiles.add(fileName);
            this.notifyChange();
        }
    }

    /**
     * Deselect a single file by name
     */
    deselect(fileName: string): void {
        if (this._selectedFiles.has(fileName)) {
            this._selectedFiles.delete(fileName);
            // Clear selectAllMatching flag when user manually deselects
            if (this._selectAllMatching) {
                this._selectAllMatching = false;
                this._selectAllMatchingSubject.next(false);
            }
            this.notifyChange();
        }
    }

    /**
     * Toggle selection state of a file
     */
    toggle(fileName: string): void {
        if (this._selectedFiles.has(fileName)) {
            this.deselect(fileName);
        } else {
            this.select(fileName);
        }
    }

    /**
     * Select multiple files at once
     */
    selectMultiple(fileNames: string[]): void {
        let changed = false;
        for (const fileName of fileNames) {
            if (!this._selectedFiles.has(fileName)) {
                this._selectedFiles.add(fileName);
                changed = true;
            }
        }
        if (changed) {
            this.notifyChange();
        }
    }

    /**
     * Select all visible files (called from header checkbox or Ctrl+A)
     * @param visibleFileNames Array of file names currently visible
     */
    selectAllVisible(visibleFileNames: string[]): void {
        this._selectedFiles = new Set(visibleFileNames);
        this.notifyChange();
    }

    /**
     * Set the "select all matching filter" flag
     * This indicates that the user wants to select all files matching
     * the current filter, even those not currently visible
     */
    setSelectAllMatchingFilter(enabled: boolean): void {
        this._selectAllMatching = enabled;
        this._selectAllMatchingSubject.next(enabled);
    }

    /**
     * Clear all selections
     */
    clearSelection(): void {
        if (this._selectedFiles.size > 0 || this._selectAllMatching) {
            this._selectedFiles.clear();
            this._selectAllMatching = false;
            this._selectAllMatchingSubject.next(false);
            this.notifyChange();
        }
    }

    /**
     * Check if a specific file is selected
     */
    isSelected(fileName: string): boolean {
        return this._selectedFiles.has(fileName);
    }

    /**
     * Get the current selection count
     */
    getSelectedCount(): number {
        return this._selectedFiles.size;
    }

    /**
     * Get the names of all selected files
     */
    getSelectedFiles(): string[] {
        return Array.from(this._selectedFiles);
    }

    /**
     * Get the "select all matching" flag value
     */
    isSelectAllMatching(): boolean {
        return this._selectAllMatching;
    }

    /**
     * Remove files from selection if they no longer exist
     * Called when the file list updates to clean up stale selections
     */
    pruneSelection(existingFileNames: Set<string>): void {
        let changed = false;
        for (const fileName of this._selectedFiles) {
            if (!existingFileNames.has(fileName)) {
                this._selectedFiles.delete(fileName);
                changed = true;
            }
        }
        if (changed) {
            this.notifyChange();
        }
    }

    private notifyChange(): void {
        // Create a new Set to ensure change detection works
        this._selectedFilesSubject.next(new Set(this._selectedFiles));
    }
}
