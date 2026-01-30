import {StorageService} from "../../services/utils/local-storage.service";

export class MockStorageService implements StorageService {
    // noinspection JSUnusedLocalSymbols
    public get(_key: string): unknown { return undefined; }

    // noinspection JSUnusedLocalSymbols
    set(_key: string, _value: unknown): void {}

    // noinspection JSUnusedLocalSymbols
    remove(_key: string): void {}
}
