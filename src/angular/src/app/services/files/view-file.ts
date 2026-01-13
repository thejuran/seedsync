import { Record } from 'immutable';

export enum ViewFileStatus {
  DEFAULT = 'default',
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  DOWNLOADED = 'downloaded',
  STOPPED = 'stopped',
  DELETED = 'deleted',
  EXTRACTING = 'extracting',
  EXTRACTED = 'extracted',
}

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
  status: ViewFileStatus | null;
  downloadingSpeed: number | null;
  eta: number | null;
  fullPath: string | null;
  isArchive: boolean | null; // corresponds to is_extractable in ModelFile
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
  remoteModifiedTimestamp: null,
};
const ViewFileRecord = Record(DefaultViewFile);

/**
 * Immutable class that implements the interface
 */
export class ViewFile extends ViewFileRecord implements IViewFile {
  declare name: string | null;
  declare isDir: boolean | null;
  declare localSize: number | null;
  declare remoteSize: number | null;
  declare percentDownloaded: number | null;
  declare status: ViewFileStatus | null;
  declare downloadingSpeed: number | null;
  declare eta: number | null;
  declare fullPath: string | null;
  declare isArchive: boolean | null;
  declare isSelected: boolean | null;
  declare isQueueable: boolean | null;
  declare isStoppable: boolean | null;
  declare isExtractable: boolean | null;
  declare isLocallyDeletable: boolean | null;
  declare isRemotelyDeletable: boolean | null;
  declare localCreatedTimestamp: Date | null;
  declare localModifiedTimestamp: Date | null;
  declare remoteCreatedTimestamp: Date | null;
  declare remoteModifiedTimestamp: Date | null;

  constructor(props: Partial<IViewFile>) {
    super(props);
  }
}
