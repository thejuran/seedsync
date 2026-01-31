import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";
import {map} from "rxjs/operators";

import {ViewFile} from "./view-file";

/**
 * FileSelectionService manages bulk file selection state.
 *
 * This service is separate from the single-file selection in ViewFileService
 * (which controls the details panel). This service manages checkbox-based
 * multi-file selection for bulk actions.
 *
 * Selection state:
 * - Selected files are tracked by name in a Set<string>
 * - "Select all matching filter" mode tracks intent to select all matching files,
 *   even those not currently visible (e.g., due to pagination)
 */
@Injectable({
    providedIn: "root"
})
export class FileSelectionService {

    // Set of selected file names
    private _selectedFiles: Set<string> = new Set();
    private _selectedFilesSubject: BehaviorSubject<Set<string>> = new BehaviorSubject(new Set());

    // Flag indicating "select all matching filter" mode
    // When true, the selection logically includes all files matching the current filter,
    // even if not all are explicitly in the selectedFiles set
    private _selectAllMatchingFilter: boolean = false;
    private _selectAllMatchingFilterSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);

    constructor() {}

    // =========================================================================
    // Selection State Observables
    // =========================================================================

    /**
     * Observable of the currently selected file names.
     */
    get selectedFiles$(): Observable<Set<string>> {
        return this._selectedFilesSubject.asObservable();
    }

    /**
     * Observable of the selected file count.
     */
    get selectedCount$(): Observable<number> {
        return this._selectedFilesSubject.pipe(
            map(files => files.size)
        );
    }

    /**
     * Observable indicating if any files are selected.
     */
    get hasSelection$(): Observable<boolean> {
        return this._selectedFilesSubject.pipe(
            map(files => files.size > 0)
        );
    }

    /**
     * Observable indicating if "select all matching filter" mode is active.
     */
    get selectAllMatchingFilter$(): Observable<boolean> {
        return this._selectAllMatchingFilterSubject.asObservable();
    }

    // =========================================================================
    // Selection State Getters (synchronous)
    // =========================================================================

    /**
     * Get the current set of selected file names.
     */
    getSelectedFiles(): Set<string> {
        return new Set(this._selectedFiles);
    }

    /**
     * Get the current number of selected files.
     */
    getSelectedCount(): number {
        return this._selectedFiles.size;
    }

    /**
     * Check if a file is currently selected.
     * @param fileName The name of the file to check
     */
    isSelected(fileName: string): boolean {
        return this._selectedFiles.has(fileName);
    }

    /**
     * Check if "select all matching filter" mode is active.
     */
    isSelectAllMatchingFilter(): boolean {
        return this._selectAllMatchingFilter;
    }

    // =========================================================================
    // Selection Modification Methods
    // =========================================================================

    /**
     * Select a single file.
     * @param fileName The name of the file to select
     */
    select(fileName: string): void {
        if (!this._selectedFiles.has(fileName)) {
            this._selectedFiles.add(fileName);
            this._pushSelection();
        }
    }

    /**
     * Deselect a single file.
     * @param fileName The name of the file to deselect
     */
    deselect(fileName: string): void {
        if (this._selectedFiles.has(fileName)) {
            this._selectedFiles.delete(fileName);
            // Deselecting any file clears "select all matching" mode
            this._clearSelectAllMatchingMode();
            this._pushSelection();
        }
    }

    /**
     * Toggle selection state of a file.
     * @param fileName The name of the file to toggle
     */
    toggle(fileName: string): void {
        if (this._selectedFiles.has(fileName)) {
            this.deselect(fileName);
        } else {
            this.select(fileName);
        }
    }

    /**
     * Select multiple files at once.
     * @param fileNames Array of file names to select
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
            this._pushSelection();
        }
    }

    /**
     * Select all visible files (those currently in the filtered view).
     * This does NOT set "select all matching" mode - only selects the provided files.
     * @param visibleFiles List of currently visible ViewFiles
     */
    selectAllVisible(visibleFiles: ViewFile[]): void {
        const fileNames = visibleFiles.map(f => f.name);
        this.selectMultiple(fileNames);
    }

    /**
     * Enable "select all matching filter" mode.
     * This indicates the user wants to select ALL files matching the current filter,
     * including those not currently visible (e.g., due to pagination).
     * @param visibleFiles List of currently visible ViewFiles to add to selection
     */
    selectAllMatchingFilter(visibleFiles: ViewFile[]): void {
        // First select all visible files
        this.selectAllVisible(visibleFiles);
        // Then set the flag
        this._selectAllMatchingFilter = true;
        this._selectAllMatchingFilterSubject.next(true);
    }

    /**
     * Clear all selections and reset to initial state.
     */
    clearSelection(): void {
        if (this._selectedFiles.size > 0 || this._selectAllMatchingFilter) {
            this._selectedFiles.clear();
            this._clearSelectAllMatchingMode();
            this._pushSelection();
        }
    }

    /**
     * Replace the current selection with a new set of files.
     * Clears "select all matching" mode.
     * @param fileNames Array of file names that should be selected
     */
    setSelection(fileNames: string[]): void {
        this._selectedFiles.clear();
        for (const fileName of fileNames) {
            this._selectedFiles.add(fileName);
        }
        this._clearSelectAllMatchingMode();
        this._pushSelection();
    }

    /**
     * Select a range of files (for shift+click).
     * Replaces current selection with the range.
     * @param fileNames Array of file names in the range
     */
    selectRange(fileNames: string[]): void {
        this.setSelection(fileNames);
    }

    /**
     * Remove files from selection that no longer exist.
     * Called when the file list updates to clean up stale selections.
     * @param existingFileNames Set of file names that currently exist
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
            if (this._selectedFiles.size === 0) {
                this._clearSelectAllMatchingMode();
            }
            this._pushSelection();
        }
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    /**
     * Push the current selection state to subscribers.
     */
    private _pushSelection(): void {
        // Create a new Set to ensure change detection works
        this._selectedFilesSubject.next(new Set(this._selectedFiles));
    }

    /**
     * Clear the "select all matching filter" mode flag.
     */
    private _clearSelectAllMatchingMode(): void {
        if (this._selectAllMatchingFilter) {
            this._selectAllMatchingFilter = false;
            this._selectAllMatchingFilterSubject.next(false);
        }
    }
}
