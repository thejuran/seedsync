import {Record} from "immutable";

/**
 * View file
 * Represents the View Model
 */
interface IViewFile {
    name: string | null;
    isDir: boolean | null;
    localSize: number | null;
    remoteSize: number | null;
    percentDownloaded: number | null;
    status: ViewFile.Status | null;
    downloadingSpeed: number | null;
    eta: number | null;
    fullPath: string | null;
    isArchive: boolean | null;  // corresponds to is_extractable in ModelFile
    isSelected: boolean | null;
    isQueueable: boolean | null;
    isStoppable: boolean | null;
    // whether file can be queued for extraction (independent of isArchive)
    isExtractable: boolean | null;
    isLocallyDeletable: boolean | null;
    isRemotelyDeletable: boolean | null;
    // timestamps
    localCreatedTimestamp: Date | null;
    localModifiedTimestamp: Date | null;
    remoteCreatedTimestamp: Date | null;
    remoteModifiedTimestamp: Date | null;
}

// Boiler plate code to set up an immutable class
const DefaultViewFile: IViewFile = {
    name: null,
    isDir: null,
    localSize: null,
    remoteSize: null,
    percentDownloaded: null,
    status: null,
    downloadingSpeed: null,
    eta: null,
    fullPath: null,
    isArchive: null,
    isSelected: null,
    isQueueable: null,
    isStoppable: null,
    isExtractable: null,
    isLocallyDeletable: null,
    isRemotelyDeletable: null,
    localCreatedTimestamp: null,
    localModifiedTimestamp: null,
    remoteCreatedTimestamp: null,
    remoteModifiedTimestamp: null
};
const ViewFileRecord = Record(DefaultViewFile);

/**
 * Immutable class that implements the interface
 */
export class ViewFile extends ViewFileRecord implements IViewFile {
    override name!: string | null;
    override isDir!: boolean | null;
    override localSize!: number | null;
    override remoteSize!: number | null;
    override percentDownloaded!: number | null;
    override status!: ViewFile.Status | null;
    override downloadingSpeed!: number | null;
    override eta!: number | null;
    // noinspection JSUnusedGlobalSymbols
    override fullPath!: string | null;
    override isArchive!: boolean | null;
    override isSelected!: boolean | null;
    override isQueueable!: boolean | null;
    override isStoppable!: boolean | null;
    override isExtractable!: boolean | null;
    override isLocallyDeletable!: boolean | null;
    override isRemotelyDeletable!: boolean | null;
    override localCreatedTimestamp!: Date | null;
    override localModifiedTimestamp!: Date | null;
    override remoteCreatedTimestamp!: Date | null;
    override remoteModifiedTimestamp!: Date | null;

    constructor(props: Partial<IViewFile>) {
        super(props);
    }
}

export module ViewFile {
    export enum Status {
        DEFAULT         = <any> "default",
        QUEUED          = <any> "queued",
        DOWNLOADING     = <any> "downloading",
        DOWNLOADED      = <any> "downloaded",
        STOPPED         = <any> "stopped",
        DELETED         = <any> "deleted",
        EXTRACTING      = <any> "extracting",
        EXTRACTED       = <any> "extracted"
    }
}
