import { Injectable } from '@angular/core';

import { LoggerService } from '../utils/logger.service';
import { ViewFile, ViewFileStatus } from './view-file';
import { ViewFileComparator, ViewFileService } from './view-file.service';
import { ViewFileOptionsService } from './view-file-options.service';
import { ViewFileSortMethod } from './view-file-options';

/**
 * Comparator used to sort the ViewFiles
 * First, sorts by status.
 * Second, sorts by name.
 */
const StatusComparator: ViewFileComparator = (a: ViewFile, b: ViewFile): number => {
  if (a.status !== b.status) {
    const statusPriorities: Record<string, number> = {
      [ViewFileStatus.EXTRACTING]: 0,
      [ViewFileStatus.DOWNLOADING]: 1,
      [ViewFileStatus.QUEUED]: 2,
      [ViewFileStatus.EXTRACTED]: 3,
      [ViewFileStatus.DOWNLOADED]: 4,
      [ViewFileStatus.STOPPED]: 5,
      [ViewFileStatus.DEFAULT]: 6,
      [ViewFileStatus.DELETED]: 6, // intermix deleted and default
    };
    const aPriority = a.status ? statusPriorities[a.status] : 7;
    const bPriority = b.status ? statusPriorities[b.status] : 7;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
  }
  return (a.name || '').localeCompare(b.name || '');
};

/**
 * Comparator used to sort the ViewFiles
 * Sort by name, ascending
 */
const NameAscendingComparator: ViewFileComparator = (a: ViewFile, b: ViewFile): number => {
  return (a.name || '').localeCompare(b.name || '');
};

/**
 * Comparator used to sort the ViewFiles
 * Sort by name, descending
 */
const NameDescendingComparator: ViewFileComparator = (a: ViewFile, b: ViewFile): number => {
  return (b.name || '').localeCompare(a.name || '');
};

/**
 * ViewFileSortService class provides sorting services for
 * view files
 *
 * This class responds to changes in the sort settings and
 * applies the appropriate comparators to the ViewFileService
 */
@Injectable({ providedIn: 'root' })
export class ViewFileSortService {
  private _sortMethod: ViewFileSortMethod | null = null;

  constructor(
    private _logger: LoggerService,
    private _viewFileService: ViewFileService,
    private _viewFileOptionsService: ViewFileOptionsService
  ) {
    this._viewFileOptionsService.options.subscribe((options) => {
      // Check if the sort method changed
      if (this._sortMethod !== options.sortMethod) {
        this._sortMethod = options.sortMethod;
        if (this._sortMethod === ViewFileSortMethod.STATUS) {
          this._viewFileService.setComparator(StatusComparator);
          this._logger.debug('Comparator set to: Status');
        } else if (this._sortMethod === ViewFileSortMethod.NAME_DESC) {
          this._viewFileService.setComparator(NameDescendingComparator);
          this._logger.debug('Comparator set to: Name Desc');
        } else if (this._sortMethod === ViewFileSortMethod.NAME_ASC) {
          this._viewFileService.setComparator(NameAscendingComparator);
          this._logger.debug('Comparator set to: Name Asc');
        } else {
          this._viewFileService.setComparator(StatusComparator);
          this._logger.debug('Comparator set to: Status (default)');
        }
      }
    });
  }
}
