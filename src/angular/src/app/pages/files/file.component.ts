import {
    Component, Input, Output, ChangeDetectionStrategy,
    EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef
} from "@angular/core";
import {CommonModule} from "@angular/common";

import {FileSizePipe} from "../../common/file-size.pipe";
import {EtaPipe} from "../../common/eta.pipe";
import {CapitalizePipe} from "../../common/capitalize.pipe";
import {ClickStopPropagationDirective} from "../../common/click-stop-propagation.directive";

import {ViewFile} from "../../services/files/view-file";
import {Localization} from "../../common/localization";
import {ViewFileOptions} from "../../services/files/view-file-options";

@Component({
    selector: "app-file",
    providers: [],
    templateUrl: "./file.component.html",
    styleUrls: ["./file.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CommonModule, FileSizePipe, EtaPipe, CapitalizePipe, ClickStopPropagationDirective]
})

export class FileComponent implements OnChanges {
    // Make ViewFile optionType accessible from template
    ViewFile = ViewFile;

    // Make FileAction accessible from template
    FileAction = FileAction;

    // Expose min function for template (handles null values)
    min = (a: number | null, b: number): number => Math.min(a ?? 0, b);

    // Entire div element
    @ViewChild("fileElement") fileElement!: ElementRef;

    @Input() file!: ViewFile;
    @Input() options!: ViewFileOptions;

    @Output() queueEvent = new EventEmitter<ViewFile>();
    @Output() stopEvent = new EventEmitter<ViewFile>();
    @Output() extractEvent = new EventEmitter<ViewFile>();
    @Output() deleteLocalEvent = new EventEmitter<ViewFile>();
    @Output() deleteRemoteEvent = new EventEmitter<ViewFile>();

    // Indicates an active action on-going
    activeAction: FileAction | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        // Check for status changes
        const oldFile: ViewFile = changes['file'].previousValue;
        const newFile: ViewFile = changes['file'].currentValue;
        if (oldFile != null && newFile != null && oldFile.status !== newFile.status) {
            // Reset any active action
            this.activeAction = null;

            // Scroll into view if this file is selected and not already in viewport
            if (newFile.isSelected && !FileComponent.isElementInViewport(this.fileElement.nativeElement)) {
                this.fileElement.nativeElement.scrollIntoView();
            }
        }
    }

    showDeleteConfirmation(title: string, message: string, callback: () => void) {
        // Using native browser confirm dialog
        // Can be replaced with a Bootstrap modal component if more sophisticated UI is needed
        if (window.confirm(`${title}\n\n${message}`)) {
            callback();
        }
    }

    isQueueable() {
        return this.activeAction == null && this.file.isQueueable;
    }

    isStoppable() {
        return this.activeAction == null && this.file.isStoppable;
    }

    isExtractable() {
        return this.activeAction == null && this.file.isExtractable && this.file.isArchive;
    }

    isLocallyDeletable() {
        return this.activeAction == null && this.file.isLocallyDeletable;
    }

    isRemotelyDeletable() {
        return this.activeAction == null && this.file.isRemotelyDeletable;
    }

    onQueue(file: ViewFile) {
        this.activeAction = FileAction.QUEUE;
        // Pass to parent component
        this.queueEvent.emit(file);
    }

    onStop(file: ViewFile) {
        this.activeAction = FileAction.STOP;
        // Pass to parent component
        this.stopEvent.emit(file);
    }

    onExtract(file: ViewFile) {
        this.activeAction = FileAction.EXTRACT;
        // Pass to parent component
        this.extractEvent.emit(file);
    }

    onDeleteLocal(file: ViewFile) {
        this.showDeleteConfirmation(
            Localization.Modal.DELETE_LOCAL_TITLE,
            Localization.Modal.DELETE_LOCAL_MESSAGE(file.name ?? ''),
            () => {
                this.activeAction = FileAction.DELETE_LOCAL;
                // Pass to parent component
                this.deleteLocalEvent.emit(file);
            }
        );
    }

    onDeleteRemote(file: ViewFile) {
        this.showDeleteConfirmation(
            Localization.Modal.DELETE_REMOTE_TITLE,
            Localization.Modal.DELETE_REMOTE_MESSAGE(file.name ?? ''),
            () => {
                this.activeAction = FileAction.DELETE_REMOTE;
                // Pass to parent component
                this.deleteRemoteEvent.emit(file);
            }
        );
    }

    // Source: https://stackoverflow.com/a/7557433
    private static isElementInViewport(el: HTMLElement): boolean {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

export enum FileAction {
    QUEUE,
    STOP,
    EXTRACT,
    DELETE_LOCAL,
    DELETE_REMOTE
}
