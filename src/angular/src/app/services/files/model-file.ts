import { Record, Set } from 'immutable';

export enum ModelFileState {
  DEFAULT = 'default',
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  DOWNLOADED = 'downloaded',
  DELETED = 'deleted',
  EXTRACTING = 'extracting',
  EXTRACTED = 'extracted',
}

/**
 * Model file received from the backend
 * Note: Naming convention matches that used in the JSON
 */
interface IModelFile {
  name: string | null;
  is_dir: boolean | null;
  local_size: number | null;
  remote_size: number | null;
  state: ModelFileState | null;
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
  children: null,
};
const ModelFileRecord = Record(DefaultModelFile);

/**
 * Immutable class that implements the interface
 * Pattern inspired by: http://blog.angular-university.io/angular-2-application
 *                      -architecture-building-flux-like-apps-using-redux-and
 *                      -immutable-js-js
 */
export class ModelFile extends ModelFileRecord implements IModelFile {
  declare name: string | null;
  declare is_dir: boolean | null;
  declare local_size: number | null;
  declare remote_size: number | null;
  declare state: ModelFileState | null;
  declare downloading_speed: number | null;
  declare eta: number | null;
  declare full_path: string | null;
  declare is_extractable: boolean | null;
  declare local_created_timestamp: Date | null;
  declare local_modified_timestamp: Date | null;
  declare remote_created_timestamp: Date | null;
  declare remote_modified_timestamp: Date | null;
  declare children: Set<ModelFile> | null;

  constructor(props: Partial<IModelFile>) {
    super(props);
  }
}

const stateMapping: { [key: string]: ModelFileState } = {
  default: ModelFileState.DEFAULT,
  queued: ModelFileState.QUEUED,
  downloading: ModelFileState.DOWNLOADING,
  downloaded: ModelFileState.DOWNLOADED,
  deleted: ModelFileState.DELETED,
  extracting: ModelFileState.EXTRACTING,
  extracted: ModelFileState.EXTRACTED,
};

export function modelFileFromJson(json: any): ModelFile {
  // Create immutable objects for children as well
  const children: ModelFile[] = [];
  for (const child of json.children) {
    children.push(modelFileFromJson(child));
  }
  json.children = Set<ModelFile>(children);

  // State mapping
  json.state = stateMapping[json.state.toLowerCase()] || ModelFileState.DEFAULT;

  // Timestamps
  if (json.local_created_timestamp != null) {
    json.local_created_timestamp = new Date(1000 * +json.local_created_timestamp);
  }
  if (json.local_modified_timestamp != null) {
    json.local_modified_timestamp = new Date(1000 * +json.local_modified_timestamp);
  }
  if (json.remote_created_timestamp != null) {
    json.remote_created_timestamp = new Date(1000 * +json.remote_created_timestamp);
  }
  if (json.remote_modified_timestamp != null) {
    json.remote_modified_timestamp = new Date(1000 * +json.remote_modified_timestamp);
  }

  return new ModelFile(json);
}
