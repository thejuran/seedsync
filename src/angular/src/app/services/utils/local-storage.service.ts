import {Injectable, InjectionToken} from "@angular/core";

export interface StorageService {
    get(key: string): any;
    set(key: string, value: any): void;
    remove(key: string): void;
}

export const LOCAL_STORAGE = new InjectionToken<StorageService>("LOCAL_STORAGE");

@Injectable({
    providedIn: "root"
})
export class LocalStorageService implements StorageService {

    get(key: string): any {
        const item = localStorage.getItem(key);
        if (item === null) {
            return null;
        }
        try {
            return JSON.parse(item);
        } catch {
            return item;
        }
    }

    set(key: string, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    remove(key: string): void {
        localStorage.removeItem(key);
    }
}
