import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import * as Immutable from 'immutable';

import { LoggerService } from '../utils/logger.service';
import { ModelFile, ModelFileState } from './model-file';
import { ModelFileService } from './model-file.service';
import { ViewFile, ViewFileStatus } from './view-file';
import { StreamServiceRegistry } from '../base/stream-service.registry';
import { WebReaction } from '../utils/rest.service';

/**
 * Interface defining filtering criteria for view files
 */
export interface ViewFileFilterCriteria {
  meetsCriteria(viewFile: ViewFile): boolean;
}

/**
 * Interface for sorting view files
 */
export interface ViewFileComparator {
  (a: ViewFile, b: ViewFile): number;
}

/**
 * ViewFileService class provides the store of view files.
 */
@Injectable({ providedIn: 'root' })
export class ViewFileService {
  private readonly USE_MOCK_MODEL = false;

  private modelFileService: ModelFileService;

  private _files: Immutable.List<ViewFile> = Immutable.List([]);
  private _filesSubject: BehaviorSubject<Immutable.List<ViewFile>> = new BehaviorSubject(this._files);
  private _filteredFilesSubject: BehaviorSubject<Immutable.List<ViewFile>> = new BehaviorSubject(this._files);
  private _indices: Map<string, number> = new Map<string, number>();

  private _prevModelFiles: Immutable.Map<string, ModelFile> = Immutable.Map<string, ModelFile>();

  private _filterCriteria: ViewFileFilterCriteria | null = null;
  private _sortComparator: ViewFileComparator | null = null;

  constructor(
    private _logger: LoggerService,
    private _streamServiceRegistry: StreamServiceRegistry
  ) {
    this.modelFileService = _streamServiceRegistry.modelFileService;

    if (!this.USE_MOCK_MODEL) {
      this.modelFileService.files.subscribe({
        next: (modelFiles) => {
          const t0 = performance.now();
          this.buildViewFromModelFiles(modelFiles);
          const t1 = performance.now();
          this._logger.debug('ViewFile creation took', (t1 - t0).toFixed(0), 'ms');
        },
      });
    }
  }

  private buildViewFromModelFiles(modelFiles: Immutable.Map<string, ModelFile>) {
    this._logger.debug('Received next model files');

    let newViewFiles = this._files;

    const addedNames: string[] = [];
    const removedNames: string[] = [];
    const updatedNames: string[] = [];

    // Loop through old model to find deletions
    this._prevModelFiles.keySeq().forEach((name) => {
      if (!modelFiles.has(name)) {
        removedNames.push(name);
      }
    });

    // Loop through new model to find additions and updates
    modelFiles.keySeq().forEach((name) => {
      if (!this._prevModelFiles.has(name)) {
        addedNames.push(name);
      } else if (!Immutable.is(modelFiles.get(name), this._prevModelFiles.get(name))) {
        updatedNames.push(name);
      }
    });

    let reSort = false;
    let updateIndices = false;

    // Do the updates first before indices change
    updatedNames.forEach((name) => {
      const index = this._indices.get(name);
      if (index !== undefined) {
        const oldViewFile = newViewFiles.get(index);
        if (oldViewFile) {
          const newViewFile = ViewFileService.createViewFile(
            modelFiles.get(name)!,
            oldViewFile.isSelected || false
          );
          newViewFiles = newViewFiles.set(index, newViewFile);
          if (this._sortComparator != null && this._sortComparator(oldViewFile, newViewFile) !== 0) {
            reSort = true;
          }
        }
      }
    });

    // Do the adds
    addedNames.forEach((name) => {
      reSort = true;
      const viewFile = ViewFileService.createViewFile(modelFiles.get(name)!);
      newViewFiles = newViewFiles.push(viewFile);
      this._indices.set(name, newViewFiles.size - 1);
    });

    // Do the removes
    removedNames.forEach((name) => {
      updateIndices = true;
      const index = newViewFiles.findIndex((value) => value.name === name);
      newViewFiles = newViewFiles.remove(index);
      this._indices.delete(name);
    });

    if (reSort && this._sortComparator != null) {
      this._logger.debug('Re-sorting view files');
      updateIndices = true;
      newViewFiles = newViewFiles.sort(this._sortComparator).toList();
    }

    if (updateIndices) {
      this._indices.clear();
      newViewFiles.forEach((value, index) => this._indices.set(value.name!, index));
    }

    this._files = newViewFiles;
    this.pushViewFiles();
    this._prevModelFiles = modelFiles;
    this._logger.debug('New view model: %O', this._files.toJS());
  }

  get files(): Observable<Immutable.List<ViewFile>> {
    return this._filesSubject.asObservable();
  }

  get filteredFiles(): Observable<Immutable.List<ViewFile>> {
    return this._filteredFilesSubject.asObservable();
  }

  public setSelected(file: ViewFile) {
    let viewFiles = this._files;
    const unSelectIndex = viewFiles.findIndex((value) => value.isSelected === true);

    if (unSelectIndex >= 0) {
      let unSelectViewFile = viewFiles.get(unSelectIndex);
      if (unSelectViewFile && unSelectViewFile.name === file.name) {
        return;
      }
      if (unSelectViewFile) {
        unSelectViewFile = new ViewFile(unSelectViewFile.set('isSelected', false));
        viewFiles = viewFiles.set(unSelectIndex, unSelectViewFile);
      }
    }

    if (this._indices.has(file.name!)) {
      const index = this._indices.get(file.name!)!;
      let viewFile = viewFiles.get(index);
      if (viewFile) {
        viewFile = new ViewFile(viewFile.set('isSelected', true));
        viewFiles = viewFiles.set(index, viewFile);
      }
    } else {
      this._logger.error('Cannot find file to select: ' + file.name);
    }

    this._files = viewFiles;
    this.pushViewFiles();
  }

  public unsetSelected() {
    let viewFiles = this._files;
    const unSelectIndex = viewFiles.findIndex((value) => value.isSelected === true);

    if (unSelectIndex >= 0) {
      let unSelectViewFile = viewFiles.get(unSelectIndex);
      if (unSelectViewFile) {
        unSelectViewFile = new ViewFile(unSelectViewFile.set('isSelected', false));
        viewFiles = viewFiles.set(unSelectIndex, unSelectViewFile);
        this._files = viewFiles;
        this.pushViewFiles();
      }
    }
  }

  public queue(file: ViewFile): Observable<WebReaction> {
    this._logger.debug('Queue view file: ' + file.name);
    return this.createAction(file, (f) => this.modelFileService.queue(f));
  }

  public stop(file: ViewFile): Observable<WebReaction> {
    this._logger.debug('Stop view file: ' + file.name);
    return this.createAction(file, (f) => this.modelFileService.stop(f));
  }

  public extract(file: ViewFile): Observable<WebReaction> {
    this._logger.debug('Extract view file: ' + file.name);
    return this.createAction(file, (f) => this.modelFileService.extract(f));
  }

  public deleteLocal(file: ViewFile): Observable<WebReaction> {
    this._logger.debug('Locally delete view file: ' + file.name);
    return this.createAction(file, (f) => this.modelFileService.deleteLocal(f));
  }

  public deleteRemote(file: ViewFile): Observable<WebReaction> {
    this._logger.debug('Remotely delete view file: ' + file.name);
    return this.createAction(file, (f) => this.modelFileService.deleteRemote(f));
  }

  public setFilterCriteria(criteria: ViewFileFilterCriteria) {
    this._filterCriteria = criteria;
    this.pushViewFiles();
  }

  public setComparator(comparator: ViewFileComparator) {
    this._sortComparator = comparator;

    this._logger.debug('Re-sorting view files');
    let newViewFiles = this._files;
    if (this._sortComparator != null) {
      newViewFiles = newViewFiles.sort(this._sortComparator).toList();
    }
    this._files = newViewFiles;
    this._indices.clear();
    newViewFiles.forEach((value, index) => this._indices.set(value.name!, index));

    this.pushViewFiles();
  }

  private static createViewFile(modelFile: ModelFile, isSelected: boolean = false): ViewFile {
    let localSize: number = modelFile.local_size || 0;
    let remoteSize: number = modelFile.remote_size || 0;
    let percentDownloaded: number;
    if (remoteSize > 0) {
      percentDownloaded = Math.trunc((100.0 * localSize) / remoteSize);
    } else {
      percentDownloaded = 100;
    }

    // Translate the status
    let status: ViewFileStatus;
    switch (modelFile.state) {
      case ModelFileState.DEFAULT: {
        if (localSize > 0 && remoteSize > 0) {
          status = ViewFileStatus.STOPPED;
        } else {
          status = ViewFileStatus.DEFAULT;
        }
        break;
      }
      case ModelFileState.QUEUED: {
        status = ViewFileStatus.QUEUED;
        break;
      }
      case ModelFileState.DOWNLOADING: {
        status = ViewFileStatus.DOWNLOADING;
        break;
      }
      case ModelFileState.DOWNLOADED: {
        status = ViewFileStatus.DOWNLOADED;
        break;
      }
      case ModelFileState.DELETED: {
        status = ViewFileStatus.DELETED;
        break;
      }
      case ModelFileState.EXTRACTING: {
        status = ViewFileStatus.EXTRACTING;
        break;
      }
      case ModelFileState.EXTRACTED: {
        status = ViewFileStatus.EXTRACTED;
        break;
      }
      default: {
        status = ViewFileStatus.DEFAULT;
      }
    }

    const isQueueable: boolean =
      [ViewFileStatus.DEFAULT, ViewFileStatus.STOPPED, ViewFileStatus.DELETED].includes(status) &&
      remoteSize > 0;
    const isStoppable: boolean = [ViewFileStatus.QUEUED, ViewFileStatus.DOWNLOADING].includes(status);
    const isExtractable: boolean =
      [
        ViewFileStatus.DEFAULT,
        ViewFileStatus.STOPPED,
        ViewFileStatus.DOWNLOADED,
        ViewFileStatus.EXTRACTED,
      ].includes(status) && localSize > 0;
    const isLocallyDeletable: boolean =
      [
        ViewFileStatus.DEFAULT,
        ViewFileStatus.STOPPED,
        ViewFileStatus.DOWNLOADED,
        ViewFileStatus.EXTRACTED,
      ].includes(status) && localSize > 0;
    const isRemotelyDeletable: boolean =
      [
        ViewFileStatus.DEFAULT,
        ViewFileStatus.STOPPED,
        ViewFileStatus.DOWNLOADED,
        ViewFileStatus.EXTRACTED,
        ViewFileStatus.DELETED,
      ].includes(status) && remoteSize > 0;

    return new ViewFile({
      name: modelFile.name,
      isDir: modelFile.is_dir,
      localSize: localSize,
      remoteSize: remoteSize,
      percentDownloaded: percentDownloaded,
      status: status,
      downloadingSpeed: modelFile.downloading_speed,
      eta: modelFile.eta,
      fullPath: modelFile.full_path,
      isArchive: modelFile.is_extractable,
      isSelected: isSelected,
      isQueueable: isQueueable,
      isStoppable: isStoppable,
      isExtractable: isExtractable,
      isLocallyDeletable: isLocallyDeletable,
      isRemotelyDeletable: isRemotelyDeletable,
      localCreatedTimestamp: modelFile.local_created_timestamp,
      localModifiedTimestamp: modelFile.local_modified_timestamp,
      remoteCreatedTimestamp: modelFile.remote_created_timestamp,
      remoteModifiedTimestamp: modelFile.remote_modified_timestamp,
    });
  }

  private createAction(
    file: ViewFile,
    action: (file: ModelFile) => Observable<WebReaction>
  ): Observable<WebReaction> {
    return new Observable((observer) => {
      if (!this._prevModelFiles.has(file.name!)) {
        this._logger.error('File to queue not found: ' + file.name);
        observer.next(new WebReaction(false, null, `File '${file.name}' not found`));
      } else {
        const modelFile = this._prevModelFiles.get(file.name!)!;
        action(modelFile).subscribe((reaction) => {
          this._logger.debug('Received model reaction: %O', reaction);
          observer.next(reaction);
        });
      }
    });
  }

  private pushViewFiles() {
    this._filesSubject.next(this._files);

    let filteredFiles = this._files;
    if (this._filterCriteria != null) {
      filteredFiles = Immutable.List<ViewFile>(
        this._files.filter((f) => this._filterCriteria!.meetsCriteria(f))
      );
    }
    this._filteredFilesSubject.next(filteredFiles);
  }
}
