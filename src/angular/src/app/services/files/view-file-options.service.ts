import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

import { LoggerService } from '../utils/logger.service';
import { ViewFileOptions, ViewFileSortMethod } from './view-file-options';
import { ViewFileStatus } from './view-file';
import { StorageKeys } from '../../common/storage-keys';

/**
 * ViewFileOptionsService class provides display option services
 * for view files
 *
 * This class is used to broadcast changes to the display options
 */
@Injectable({ providedIn: 'root' })
export class ViewFileOptionsService {
  private _options: BehaviorSubject<ViewFileOptions>;

  constructor(private _logger: LoggerService) {
    // Load some options from storage
    const showDetails: boolean = this.getStorageItem(StorageKeys.VIEW_OPTION_SHOW_DETAILS, false);
    const sortMethod: ViewFileSortMethod = this.getStorageItem(
      StorageKeys.VIEW_OPTION_SORT_METHOD,
      ViewFileSortMethod.STATUS
    );
    const pinFilter: boolean = this.getStorageItem(StorageKeys.VIEW_OPTION_PIN, false);

    this._options = new BehaviorSubject(
      new ViewFileOptions({
        showDetails: showDetails,
        sortMethod: sortMethod,
        selectedStatusFilter: null,
        nameFilter: null,
        pinFilter: pinFilter,
      })
    );
  }

  private getStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  }

  get options(): Observable<ViewFileOptions> {
    return this._options.asObservable();
  }

  public setShowDetails(show: boolean) {
    const options = this._options.getValue();
    if (options.showDetails !== show) {
      const newOptions = new ViewFileOptions(options.set('showDetails', show));
      this._options.next(newOptions);
      this.setStorageItem(StorageKeys.VIEW_OPTION_SHOW_DETAILS, show);
      this._logger.debug('ViewOption showDetails set to: ' + newOptions.showDetails);
    }
  }

  public setSortMethod(sortMethod: ViewFileSortMethod) {
    const options = this._options.getValue();
    if (options.sortMethod !== sortMethod) {
      const newOptions = new ViewFileOptions(options.set('sortMethod', sortMethod));
      this._options.next(newOptions);
      this.setStorageItem(StorageKeys.VIEW_OPTION_SORT_METHOD, sortMethod);
      this._logger.debug('ViewOption sortMethod set to: ' + newOptions.sortMethod);
    }
  }

  public setSelectedStatusFilter(status: ViewFileStatus | null) {
    const options = this._options.getValue();
    if (options.selectedStatusFilter !== status) {
      const newOptions = new ViewFileOptions(options.set('selectedStatusFilter', status));
      this._options.next(newOptions);
      this._logger.debug('ViewOption selectedStatusFilter set to: ' + newOptions.selectedStatusFilter);
    }
  }

  public setNameFilter(name: string | null) {
    const options = this._options.getValue();
    if (options.nameFilter !== name) {
      const newOptions = new ViewFileOptions(options.set('nameFilter', name));
      this._options.next(newOptions);
      this._logger.debug('ViewOption nameFilter set to: ' + newOptions.nameFilter);
    }
  }

  public setPinFilter(pinned: boolean) {
    const options = this._options.getValue();
    if (options.pinFilter !== pinned) {
      const newOptions = new ViewFileOptions(options.set('pinFilter', pinned));
      this._options.next(newOptions);
      this.setStorageItem(StorageKeys.VIEW_OPTION_PIN, pinned);
      this._logger.debug('ViewOption pinFilter set to: ' + newOptions.pinFilter);
    }
  }
}
