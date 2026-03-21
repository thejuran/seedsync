import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from "@angular/core";


/**
 * Selection banner component that displays when files are selected.
 *
 * Shows:
 * - Count of selected files (e.g., "5 files selected")
 * - "Clear" button to clear selection
 */
@Component({
    selector: "app-selection-banner",
    templateUrl: "./selection-banner.component.html",
    styleUrls: ["./selection-banner.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,

})
export class SelectionBannerComponent {

    /**
     * The set of currently selected file names.
     */
    @Input() selectedFiles: Set<string> = new Set();

    /**
     * Emitted when user clicks "Clear" button.
     */
    @Output() clearSelection = new EventEmitter<void>();

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
        return count === 1 ? "1 file selected" : `${count} files selected`;
    }

    /**
     * Handle "Clear" button click.
     */
    onClearClick(): void {
        this.clearSelection.emit();
    }
}
