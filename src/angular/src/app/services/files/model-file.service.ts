import {Injectable} from "@angular/core";
import {Observable, BehaviorSubject} from "rxjs";

import * as Immutable from "immutable";

import {LoggerService} from "../utils/logger.service";
import {ModelFile} from "./model-file";
import {BaseStreamService} from "../base/base-stream.service";
import {RestService, WebReaction} from "../utils/rest.service";


/**
 * ModelFileService class provides the store for model files
 * It implements the observable service pattern to push updates
 * as they become available.
 * The model is stored as an Immutable Map of name=>ModelFiles. Hence, the
 * ModelFiles have no defined order. The name key allows more efficient
 * lookup and model diffing.
 * Reference: http://blog.angular-university.io/how-to-build-angular2
 *            -apps-using-rxjs-observable-data-services-pitfalls-to-avoid
 */
@Injectable()
export class ModelFileService extends BaseStreamService {
    private readonly EVENT_INIT = "model-init";
    private readonly EVENT_ADDED = "model-added";
    private readonly EVENT_UPDATED = "model-updated";
    private readonly EVENT_REMOVED = "model-removed";

    private _files: BehaviorSubject<Immutable.Map<string, ModelFile>> =
        new BehaviorSubject(Immutable.Map<string, ModelFile>());

    constructor(private _logger: LoggerService,
                private _restService: RestService) {
        super();
        this.registerEventName(this.EVENT_INIT);
        this.registerEventName(this.EVENT_ADDED);
        this.registerEventName(this.EVENT_UPDATED);
        this.registerEventName(this.EVENT_REMOVED);
    }

    get files(): Observable<Immutable.Map<string, ModelFile>> {
        return this._files.asObservable();
    }

    /**
     * Queue a file for download
     * @param {ModelFile} file
     * @returns {Observable<WebReaction>}
     */
    public queue(file: ModelFile): Observable<WebReaction> {
        this._logger.debug("Queue model file: " + file.name);
        // Double-encode the value
        const fileName = file.name ?? '';
        const fileNameEncoded = encodeURIComponent(encodeURIComponent(fileName));
        const url: string = "/server/command/queue/" + fileNameEncoded;
        return this._restService.sendRequest(url);
    }

    /**
     * Stop a file
     * @param {ModelFile} file
     * @returns {Observable<WebReaction>}
     */
    public stop(file: ModelFile): Observable<WebReaction> {
        this._logger.debug("Stop model file: " + file.name);
        // Double-encode the value
        const fileName = file.name ?? '';
        const fileNameEncoded = encodeURIComponent(encodeURIComponent(fileName));
        const url: string = "/server/command/stop/" + fileNameEncoded;
        return this._restService.sendRequest(url);
    }

    /**
     * Extract a file
     * @param {ModelFile} file
     * @returns {Observable<WebReaction>}
     */
    public extract(file: ModelFile): Observable<WebReaction> {
        this._logger.debug("Extract model file: " + file.name);
        // Double-encode the value
        const fileName = file.name ?? '';
        const fileNameEncoded = encodeURIComponent(encodeURIComponent(fileName));
        const url: string = "/server/command/extract/" + fileNameEncoded;
        return this._restService.sendRequest(url);
    }

    /**
     * Delete file locally
     * @param {ModelFile} file
     * @returns {Observable<WebReaction>}
     */
    public deleteLocal(file: ModelFile): Observable<WebReaction> {
        this._logger.debug("Delete locally model file: " + file.name);
        // Double-encode the value
        const fileName = file.name ?? '';
        const fileNameEncoded = encodeURIComponent(encodeURIComponent(fileName));
        const url: string = "/server/command/delete_local/" + fileNameEncoded;
        return this._restService.sendRequest(url);
    }

    /**
     * Delete file remotely
     * @param {ModelFile} file
     * @returns {Observable<WebReaction>}
     */
    public deleteRemote(file: ModelFile): Observable<WebReaction> {
        this._logger.debug("Delete remotely model file: " + file.name);
        // Double-encode the value
        const fileName = file.name ?? '';
        const fileNameEncoded = encodeURIComponent(encodeURIComponent(fileName));
        const url: string = "/server/command/delete_remote/" + fileNameEncoded;
        return this._restService.sendRequest(url);
    }

    protected onEvent(eventName: string, data: string): void {
        this.parseEvent(eventName, data);
    }

    protected onConnected(): void {
        // nothing to do
    }

    protected onDisconnected(): void {
        // Update clients by clearing the model
        this._files.next(this._files.getValue().clear());
    }

    /**
     * Parse an event and update the file model
     * @param {string} name
     * @param {string} data
     */
    private parseEvent(name: string, data: string) {
        if (name === this.EVENT_INIT) {
            // Init event receives an array of ModelFiles
            let t0: number;
            let t1: number;

            t0 = performance.now();
            const parsed: unknown[] = JSON.parse(data);
            t1 = performance.now();
            this._logger.debug("Parsing took", (t1 - t0).toFixed(0), "ms");

            t0 = performance.now();
            const newFiles: ModelFile[] = [];
            for (const file of parsed) {
                newFiles.push(ModelFile.fromJson(file as Parameters<typeof ModelFile.fromJson>[0]));
            }
            t1 = performance.now();
            this._logger.debug("ModelFile creation took", (t1 - t0).toFixed(0), "ms");

            // Replace the entire model
            t0 = performance.now();
            const entries: [string, ModelFile][] = newFiles
                .filter(value => value.name !== null)
                .map(value => [value.name as string, value]);
            const newMap = Immutable.Map<string, ModelFile>(entries);
            t1 = performance.now();
            this._logger.debug("ModelFile map creation took", (t1 - t0).toFixed(0), "ms");

            this._files.next(newMap);
            // this._logger.debug("New model: %O", this._files.getValue().toJS());
        } else if (name === this.EVENT_ADDED) {
            // Added event receives old and new ModelFiles
            // Only new file is relevant
            const parsed: {new_file: unknown} = JSON.parse(data);
            const file = ModelFile.fromJson(parsed.new_file as Parameters<typeof ModelFile.fromJson>[0]);
            const fileName = file.name;
            if (!fileName) {
                this._logger.error("ModelFile has no name");
            } else if (this._files.getValue().has(fileName)) {
                this._logger.error("ModelFile named " + fileName + " already exists");
            } else {
                this._files.next(this._files.getValue().set(fileName, file));
                this._logger.debug("Added file: %O", file.toJS());
            }
        } else if (name === this.EVENT_REMOVED) {
            // Removed event receives old and new ModelFiles
            // Only old file is relevant
            const parsed: {old_file: unknown} = JSON.parse(data);
            const file = ModelFile.fromJson(parsed.old_file as Parameters<typeof ModelFile.fromJson>[0]);
            const fileName = file.name;
            if (!fileName) {
                this._logger.error("ModelFile has no name");
            } else if (this._files.getValue().has(fileName)) {
                this._files.next(this._files.getValue().remove(fileName));
                this._logger.debug("Removed file: %O", file.toJS());
            } else {
                this._logger.error("Failed to find ModelFile named " + fileName);
            }
        } else if (name === this.EVENT_UPDATED) {
            // Updated event received old and new ModelFiles
            // We will only use the new one here
            const parsed: {new_file: unknown} = JSON.parse(data);
            const file = ModelFile.fromJson(parsed.new_file as Parameters<typeof ModelFile.fromJson>[0]);
            const fileName = file.name;
            if (!fileName) {
                this._logger.error("ModelFile has no name");
            } else if (this._files.getValue().has(fileName)) {
                this._files.next(this._files.getValue().set(fileName, file));
                this._logger.debug("Updated file: %O", file.toJS());
            } else {
                this._logger.error("Failed to find ModelFile named " + fileName);
            }
        } else {
            this._logger.error("Unrecognized event:", name);
        }
    }
}
