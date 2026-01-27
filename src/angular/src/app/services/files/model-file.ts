import {Record, Set} from "immutable";

/**
 * Model file received from the backend
 * Note: Naming convention matches that used in the JSON
 */
interface IModelFile {
    name: string | null;
    is_dir: boolean | null;
    local_size: number | null;
    remote_size: number | null;
    state: ModelFile.State | null;
    downloading_speed: number | null;
    eta: number | null;
    full_path: string | null;
    is_extractable: boolean | null;
    local_created_timestamp: Date | null;
    local_modified_timestamp: Date | null;
    remote_created_timestamp: Date | null;
    remote_modified_timestamp: Date | null;
    children: Set<ModelFile> | null;
}

// Boiler plate code to set up an immutable class
const DefaultModelFile: IModelFile = {
    name: null,
    is_dir: null,
    local_size: null,
    remote_size: null,
    state: null,
    downloading_speed: null,
    eta: null,
    full_path: null,
    is_extractable: null,
    local_created_timestamp: null,
    local_modified_timestamp: null,
    remote_created_timestamp: null,
    remote_modified_timestamp: null,
    children: null
};
const ModelFileRecord = Record(DefaultModelFile);

/**
 * Immutable class that implements the interface
 * Pattern inspired by: http://blog.angular-university.io/angular-2-application
 *                      -architecture-building-flux-like-apps-using-redux-and
 *                      -immutable-js-js
 */
export class ModelFile extends ModelFileRecord implements IModelFile {
    override name!: string | null;
    override is_dir!: boolean | null;
    override local_size!: number | null;
    override remote_size!: number | null;
    override state!: ModelFile.State | null;
    override downloading_speed!: number | null;
    override eta!: number | null;
    override full_path!: string | null;
    override is_extractable!: boolean | null;
    override local_created_timestamp!: Date | null;
    override local_modified_timestamp!: Date | null;
    override remote_created_timestamp!: Date | null;
    override remote_modified_timestamp!: Date | null;
    override children!: Set<ModelFile> | null;

    constructor(props: Partial<IModelFile>) {
        super(props);
    }
}

// JSON object type for fromJson
interface ModelFileJson {
    name: string;
    is_dir: boolean;
    local_size: number;
    remote_size: number;
    state: string;
    downloading_speed: number;
    eta: number;
    full_path: string;
    is_extractable: boolean;
    local_created_timestamp: number | null;
    local_modified_timestamp: number | null;
    remote_created_timestamp: number | null;
    remote_modified_timestamp: number | null;
    children: ModelFileJson[];
}

// Additional types
export module ModelFile {
    export function fromJson(json: ModelFileJson): ModelFile {
        // Create immutable objects for children as well
        const children: ModelFile[] = [];
        for (const child of json.children) {
            children.push(ModelFile.fromJson(child));
        }

        const result: Partial<IModelFile> = {
            name: json.name,
            is_dir: json.is_dir,
            local_size: json.local_size,
            remote_size: json.remote_size,
            downloading_speed: json.downloading_speed,
            eta: json.eta,
            full_path: json.full_path,
            is_extractable: json.is_extractable,
            children: Set<ModelFile>(children),
            // State mapping
            state: ModelFile.State[json.state.toUpperCase() as keyof typeof ModelFile.State],
            // Timestamps
            local_created_timestamp: json.local_created_timestamp != null
                ? new Date(1000 * json.local_created_timestamp)
                : null,
            local_modified_timestamp: json.local_modified_timestamp != null
                ? new Date(1000 * json.local_modified_timestamp)
                : null,
            remote_created_timestamp: json.remote_created_timestamp != null
                ? new Date(1000 * json.remote_created_timestamp)
                : null,
            remote_modified_timestamp: json.remote_modified_timestamp != null
                ? new Date(1000 * json.remote_modified_timestamp)
                : null
        };

        return new ModelFile(result);
    }

    export enum State {
        DEFAULT         = <any> "default",
        QUEUED          = <any> "queued",
        DOWNLOADING     = <any> "downloading",
        DOWNLOADED      = <any> "downloaded",
        DELETED         = <any> "deleted",
        EXTRACTING      = <any> "extracting",
        EXTRACTED       = <any> "extracted"
    }
}
