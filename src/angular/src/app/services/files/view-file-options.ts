import {Record} from "immutable";

import {ViewFile} from "./view-file";

/**
 * View file options
 * Describes display related options for view files
 */
interface IViewFileOptions {
    // Show additional details about the view file
    showDetails: boolean | null;

    // Method to use to sort the view file list
    sortMethod: ViewFileOptions.SortMethod | null;

    // Status filter setting
    selectedStatusFilter: ViewFile.Status | null;

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
    override showDetails!: boolean | null;
    override sortMethod!: ViewFileOptions.SortMethod | null;
    override selectedStatusFilter!: ViewFile.Status | null;
    override nameFilter!: string | null;
    override pinFilter!: boolean | null;

    constructor(props: Partial<IViewFileOptions>) {
        super(props);
    }
}

export module ViewFileOptions {
    export enum SortMethod {
        STATUS,
        NAME_ASC,
        NAME_DESC
    }
}
