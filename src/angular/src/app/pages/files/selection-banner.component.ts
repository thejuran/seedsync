import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from "@angular/core";
import {NgIf} from "@angular/common";

import {List} from "immutable";

import {FileSelectionService} from "../../services/files/file-selection.service";
import {ViewFile} from "../../services/files/view-file";

/**
 * Selection banner component that displays when files are selected.
 *
 * Shows:
 * - Count of selected files (e.g., "5 files selected")
 * - "Select all X matching filter" link when all visible files are selected
 * - "Clear" button to clear selection
 */
@Component({
    selector: "app-selection-banner",
    templateUrl: "./selection-banner.component.html",
    styleUrls: ["./selection-banner.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgIf]
})
export class SelectionBannerComponent {

    /**
     * The list of currently visible (filtered) files.
     */
    @Input() visibleFiles: List<ViewFile> = List();

    /**
     * The total count of files matching the current filter.
     * This may be larger than visibleFiles if pagination is used.
     * For now, this equals visibleFiles.size since there's no pagination.
     */
    @Input() totalMatchingCount = 0;

    /**
     * The set of currently selected file names.
     */
    @Input() selectedFiles: Set<string> = new Set();

    /**
     * Whether "select all matching filter" mode is active.
     */
    @Input() selectAllMatchingFilterActive = false;

    /**
     * Emitted when user clicks "Clear" button.
     */
    @Output() clearSelection = new EventEmitter<void>();

    /**
     * Emitted when user clicks "Select all X matching filter".
     */
    @Output() selectAllMatchingFilter = new EventEmitter<void>();

    constructor(private fileSelectionService: FileSelectionService) {}

    /**
     * Get the count of selected files.
     */
    get selectedCount(): number {
        return this.selectedFiles.size;
    }

    /**
     * Check if any files are selected (determines banner visibility).
     */
    get hasSelection(): boolean {
        return this.selectedFiles.size > 0;
    }

    /**
     * Get the text for the selection count.
     */
    get selectionText(): string {
        const count = this.selectedCount;
        if (this.selectAllMatchingFilterActive && this.totalMatchingCount > count) {
            // "Select all matching" is active, show total
            return `All ${this.totalMatchingCount} files matching filter selected`;
        }
        return count === 1 ? "1 file selected" : `${count} files selected`;
    }

    /**
     * Check if all visible files are selected.
     */
    get allVisibleSelected(): boolean {
        if (this.visibleFiles.size === 0) {
            return false;
        }
        const visibleSelectedCount = this.visibleFiles.filter(
            f => this.selectedFiles.has(f.name)
        ).size;
        return visibleSelectedCount === this.visibleFiles.size;
    }

    /**
     * Check if we should show the "Select all matching filter" link.
     * This shows when:
     * - All visible files are selected
     * - "Select all matching" mode is NOT active
     * - There might be more files matching the filter (for future pagination support)
     */
    get showSelectAllMatchingLink(): boolean {
        return this.allVisibleSelected &&
               !this.selectAllMatchingFilterActive &&
               this.visibleFiles.size > 0;
    }

    /**
     * Handle "Clear" button click.
     */
    onClearClick(): void {
        this.clearSelection.emit();
    }

    /**
     * Handle "Select all matching filter" link click.
     */
    onSelectAllMatchingClick(): void {
        this.selectAllMatchingFilter.emit();
    }
}
