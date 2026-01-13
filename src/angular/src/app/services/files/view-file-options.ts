import { Record } from 'immutable';

import { ViewFileStatus } from './view-file';

export enum ViewFileSortMethod {
  STATUS,
  NAME_ASC,
  NAME_DESC,
}

/**
 * View file options
 * Describes display related options for view files
 */
interface IViewFileOptions {
  // Show additional details about the view file
  showDetails: boolean | null;

  // Method to use to sort the view file list
  sortMethod: ViewFileSortMethod | null;

  // Status filter setting
  selectedStatusFilter: ViewFileStatus | null;

  // Name filter setting
  nameFilter: string | null;

  // Track filter pin status
  pinFilter: boolean | null;
}

// Boiler plate code to set up an immutable class
const DefaultViewFileOptions: IViewFileOptions = {
  showDetails: null,
  sortMethod: null,
  selectedStatusFilter: null,
  nameFilter: null,
  pinFilter: null,
};
const ViewFileOptionsRecord = Record(DefaultViewFileOptions);

/**
 * Immutable class that implements the interface
 */
export class ViewFileOptions extends ViewFileOptionsRecord implements IViewFileOptions {
  declare showDetails: boolean | null;
  declare sortMethod: ViewFileSortMethod | null;
  declare selectedStatusFilter: ViewFileStatus | null;
  declare nameFilter: string | null;
  declare pinFilter: boolean | null;

  constructor(props: Partial<IViewFileOptions>) {
    super(props);
  }
}
