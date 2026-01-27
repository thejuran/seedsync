import {Injectable} from "@angular/core";
import {Observable, BehaviorSubject} from "rxjs";

import {LoggerService} from "../utils/logger.service";
import {ViewFileOptions} from "./view-file-options";
import {ViewFile} from "./view-file";
import {StorageKeys} from "../../common/storage-keys";



/**
 * ViewFileOptionsService class provides display option services
 * for view files
 *
 * This class is used to broadcast changes to the display options
 */
@Injectable()
export class ViewFileOptionsService {

    private _options: BehaviorSubject<ViewFileOptions>;

    constructor(private _logger: LoggerService) {
        // Load some options from storage using native localStorage
        const showDetailsStr = localStorage.getItem(StorageKeys.VIEW_OPTION_SHOW_DETAILS);
        const showDetails: boolean = showDetailsStr ? JSON.parse(showDetailsStr) : false;

        const sortMethodStr = localStorage.getItem(StorageKeys.VIEW_OPTION_SORT_METHOD);
        const sortMethod: ViewFileOptions.SortMethod = sortMethodStr
            ? JSON.parse(sortMethodStr)
            : ViewFileOptions.SortMethod.STATUS;

        const pinFilterStr = localStorage.getItem(StorageKeys.VIEW_OPTION_PIN);
        const pinFilter: boolean = pinFilterStr ? JSON.parse(pinFilterStr) : false;

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

    get options(): Observable<ViewFileOptions> {
        return this._options.asObservable();
    }

    public setShowDetails(show: boolean) {
        const options = this._options.getValue();
        if (options.showDetails !== show) {
            const newOptions = new ViewFileOptions(options.set("showDetails", show));
            this._options.next(newOptions);
            localStorage.setItem(StorageKeys.VIEW_OPTION_SHOW_DETAILS, JSON.stringify(show));
            this._logger.debug("ViewOption showDetails set to: " + newOptions.showDetails);
        }
    }

    public setSortMethod(sortMethod: ViewFileOptions.SortMethod) {
        const options = this._options.getValue();
        if (options.sortMethod !== sortMethod) {
            const newOptions = new ViewFileOptions(options.set("sortMethod", sortMethod));
            this._options.next(newOptions);
            localStorage.setItem(StorageKeys.VIEW_OPTION_SORT_METHOD, JSON.stringify(sortMethod));
            this._logger.debug("ViewOption sortMethod set to: " + newOptions.sortMethod);
        }
    }

    public setSelectedStatusFilter(status: ViewFile.Status | null) {
        const options = this._options.getValue();
        if (options.selectedStatusFilter !== status) {
            const newOptions = new ViewFileOptions(options.set("selectedStatusFilter", status));
            this._options.next(newOptions);
            this._logger.debug("ViewOption selectedStatusFilter set to: " + newOptions.selectedStatusFilter);
        }
    }

    public setNameFilter(name: string) {
        const options = this._options.getValue();
        if (options.nameFilter !== name) {
            const newOptions = new ViewFileOptions(options.set("nameFilter", name));
            this._options.next(newOptions);
            this._logger.debug("ViewOption nameFilter set to: " + newOptions.nameFilter);
        }
    }

    public setPinFilter(pinned: boolean) {
        const options = this._options.getValue();
        if (options.pinFilter !== pinned) {
            const newOptions = new ViewFileOptions(options.set("pinFilter", pinned));
            this._options.next(newOptions);
            localStorage.setItem(StorageKeys.VIEW_OPTION_PIN, JSON.stringify(pinned));
            this._logger.debug("ViewOption pinFilter set to: " + newOptions.pinFilter);
        }
    }
}
