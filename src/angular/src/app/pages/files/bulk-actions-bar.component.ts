import {Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from "@angular/core";
import {NgIf} from "@angular/common";

import {List} from "immutable";

import {ViewFile} from "../../services/files/view-file";

/**
 * Action counts for bulk operations.
 */
export interface BulkActionCounts {
    queueable: number;
    stoppable: number;
    extractable: number;
    locallyDeletable: number;
    remotelyDeletable: number;
}

/**
 * Bulk actions bar component that displays when files are selected.
 *
 * Shows action buttons with counts indicating how many selected files
 * are eligible for each action. Buttons are disabled when count is 0.
 *
 * Button order: Queue, Stop, Extract, Delete Local, Delete Remote
 */
@Component({
    selector: "app-bulk-actions-bar",
    templateUrl: "./bulk-actions-bar.component.html",
    styleUrls: ["./bulk-actions-bar.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgIf]
})
export class BulkActionsBarComponent {

    /**
     * The list of currently visible (filtered) files.
     */
    @Input() visibleFiles: List<ViewFile> = List();

    /**
     * The set of currently selected file names.
     */
    @Input() selectedFiles: Set<string> = new Set();

    /**
     * Emitted when user clicks Queue button.
     * Passes array of file names that are queueable.
     */
    @Output() queueAction = new EventEmitter<string[]>();

    /**
     * Emitted when user clicks Stop button.
     * Passes array of file names that are stoppable.
     */
    @Output() stopAction = new EventEmitter<string[]>();

    /**
     * Emitted when user clicks Extract button.
     * Passes array of file names that are extractable.
     */
    @Output() extractAction = new EventEmitter<string[]>();

    /**
     * Emitted when user clicks Delete Local button.
     * Passes array of file names that are locally deletable.
     */
    @Output() deleteLocalAction = new EventEmitter<string[]>();

    /**
     * Emitted when user clicks Delete Remote button.
     * Passes array of file names that are remotely deletable.
     */
    @Output() deleteRemoteAction = new EventEmitter<string[]>();

    /**
     * Check if any files are selected (determines bar visibility).
     */
    get hasSelection(): boolean {
        return this.selectedFiles.size > 0;
    }

    /**
     * Get the count of selected files.
     */
    get selectedCount(): number {
        return this.selectedFiles.size;
    }

    /**
     * Get the list of selected ViewFile objects.
     */
    get selectedViewFiles(): ViewFile[] {
        return this.visibleFiles.filter(f => this.selectedFiles.has(f.name)).toArray();
    }

    /**
     * Calculate action counts for all selected files.
     */
    get actionCounts(): BulkActionCounts {
        const selectedViewFiles = this.selectedViewFiles;
        return {
            queueable: selectedViewFiles.filter(f => f.isQueueable).length,
            stoppable: selectedViewFiles.filter(f => f.isStoppable).length,
            extractable: selectedViewFiles.filter(f => f.isExtractable).length,
            locallyDeletable: selectedViewFiles.filter(f => f.isLocallyDeletable).length,
            remotelyDeletable: selectedViewFiles.filter(f => f.isRemotelyDeletable).length
        };
    }

    /**
     * Get files that are queueable.
     */
    get queueableFiles(): string[] {
        return this.selectedViewFiles.filter(f => f.isQueueable).map(f => f.name);
    }

    /**
     * Get files that are stoppable.
     */
    get stoppableFiles(): string[] {
        return this.selectedViewFiles.filter(f => f.isStoppable).map(f => f.name);
    }

    /**
     * Get files that are extractable.
     */
    get extractableFiles(): string[] {
        return this.selectedViewFiles.filter(f => f.isExtractable).map(f => f.name);
    }

    /**
     * Get files that are locally deletable.
     */
    get locallyDeletableFiles(): string[] {
        return this.selectedViewFiles.filter(f => f.isLocallyDeletable).map(f => f.name);
    }

    /**
     * Get files that are remotely deletable.
     */
    get remotelyDeletableFiles(): string[] {
        return this.selectedViewFiles.filter(f => f.isRemotelyDeletable).map(f => f.name);
    }

    /**
     * Handle Queue button click.
     */
    onQueueClick(): void {
        const files = this.queueableFiles;
        if (files.length > 0) {
            this.queueAction.emit(files);
        }
    }

    /**
     * Handle Stop button click.
     */
    onStopClick(): void {
        const files = this.stoppableFiles;
        if (files.length > 0) {
            this.stopAction.emit(files);
        }
    }

    /**
     * Handle Extract button click.
     */
    onExtractClick(): void {
        const files = this.extractableFiles;
        if (files.length > 0) {
            this.extractAction.emit(files);
        }
    }

    /**
     * Handle Delete Local button click.
     */
    onDeleteLocalClick(): void {
        const files = this.locallyDeletableFiles;
        if (files.length > 0) {
            this.deleteLocalAction.emit(files);
        }
    }

    /**
     * Handle Delete Remote button click.
     */
    onDeleteRemoteClick(): void {
        const files = this.remotelyDeletableFiles;
        if (files.length > 0) {
            this.deleteRemoteAction.emit(files);
        }
    }
}
