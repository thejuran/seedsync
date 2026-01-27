import {fakeAsync, TestBed, tick} from "@angular/core/testing";

import {ViewFileOptionsService} from "../../../../services/files/view-file-options.service";
import {ViewFileOptions} from "../../../../services/files/view-file-options";
import {ViewFile} from "../../../../services/files/view-file";
import {LoggerService} from "../../../../services/utils/logger.service";
import {StorageKeys} from "../../../../common/storage-keys";


function createViewOptionsService(): ViewFileOptionsService {
    return new ViewFileOptionsService(
        TestBed.inject(LoggerService)
    );
}


describe("Testing view file options service", () => {
    let viewOptionsService: ViewFileOptionsService;
    let localStorageGetSpy: jasmine.Spy;
    let localStorageSetSpy: jasmine.Spy;

    beforeEach(() => {
        // Mock localStorage
        localStorageGetSpy = spyOn(localStorage, "getItem").and.returnValue(null);
        localStorageSetSpy = spyOn(localStorage, "setItem");

        TestBed.configureTestingModule({
            providers: [
                ViewFileOptionsService,
                LoggerService,
            ]
        });

        viewOptionsService = TestBed.inject(ViewFileOptionsService);
    });

    it("should create an instance", () => {
        expect(viewOptionsService).toBeDefined();
    });

    it("should forward default options", fakeAsync(() => {
        let count = 0;

        viewOptionsService.options.subscribe({
            next: options => {
                expect(options.showDetails).toBe(false);
                expect(options.sortMethod).toBe(ViewFileOptions.SortMethod.STATUS);
                expect(options.selectedStatusFilter).toBeNull();
                expect(options.nameFilter).toBeNull();
                expect(options.pinFilter).toBe(false);
                count++;
            }
        });

        tick();
        expect(count).toBe(1);
    }));

    it("should forward updates to showDetails", fakeAsync(() => {
        let count = 0;
        let showDetails = null;
        viewOptionsService.options.subscribe({
            next: options => {
                showDetails = options.showDetails;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);

        viewOptionsService.setShowDetails(true);
        tick();
        expect(showDetails).toBe(true);
        expect(count).toBe(2);

        viewOptionsService.setShowDetails(false);
        tick();
        expect(showDetails).toBe(false);
        expect(count).toBe(3);

        // Setting same value shouldn't trigger an update
        viewOptionsService.setShowDetails(false);
        tick();
        expect(showDetails).toBe(false);
        expect(count).toBe(3);
    }));

    it("should load showDetails from storage", fakeAsync(() => {
        localStorageGetSpy.and.callFake((key: string) => {
            if (key === StorageKeys.VIEW_OPTION_SHOW_DETAILS) {
                return JSON.stringify(true);
            }
            return null;
        });
        // Recreate the service
        viewOptionsService = createViewOptionsService();
        expect(localStorage.getItem).toHaveBeenCalledWith(StorageKeys.VIEW_OPTION_SHOW_DETAILS);

        let count = 0;
        let showDetails = null;
        viewOptionsService.options.subscribe({
            next: options => {
                showDetails = options.showDetails;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);
        expect(showDetails).toBe(true);
    }));

    it("should save showDetails to storage", fakeAsync(() => {
        viewOptionsService.setShowDetails(true);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            StorageKeys.VIEW_OPTION_SHOW_DETAILS,
            JSON.stringify(true)
        );
        viewOptionsService.setShowDetails(false);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            StorageKeys.VIEW_OPTION_SHOW_DETAILS,
            JSON.stringify(false)
        );
    }));

    it("should forward updates to sortMethod", fakeAsync(() => {
        let count = 0;
        let sortMethod = null;
        viewOptionsService.options.subscribe({
            next: options => {
                sortMethod = options.sortMethod;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);

        viewOptionsService.setSortMethod(ViewFileOptions.SortMethod.NAME_ASC);
        tick();
        expect(sortMethod).toBe(ViewFileOptions.SortMethod.NAME_ASC);
        expect(count).toBe(2);

        viewOptionsService.setSortMethod(ViewFileOptions.SortMethod.NAME_DESC);
        tick();
        expect(sortMethod).toBe(ViewFileOptions.SortMethod.NAME_DESC);
        expect(count).toBe(3);

        // Setting same value shouldn't trigger an update
        viewOptionsService.setSortMethod(ViewFileOptions.SortMethod.NAME_DESC);
        tick();
        expect(sortMethod).toBe(ViewFileOptions.SortMethod.NAME_DESC);
        expect(count).toBe(3);
    }));

    it("should load sortMethod from storage", fakeAsync(() => {
        localStorageGetSpy.and.callFake((key: string) => {
            if (key === StorageKeys.VIEW_OPTION_SORT_METHOD) {
                return JSON.stringify(ViewFileOptions.SortMethod.NAME_ASC);
            }
            return null;
        });
        // Recreate the service
        viewOptionsService = createViewOptionsService();
        expect(localStorage.getItem).toHaveBeenCalledWith(StorageKeys.VIEW_OPTION_SHOW_DETAILS);

        let count = 0;
        let sortMethod = null;
        viewOptionsService.options.subscribe({
            next: options => {
                sortMethod = options.sortMethod;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);
        expect(sortMethod).toBe(ViewFileOptions.SortMethod.NAME_ASC);
    }));

    it("should save sortMethod to storage", fakeAsync(() => {
        viewOptionsService.setSortMethod(ViewFileOptions.SortMethod.NAME_ASC);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            StorageKeys.VIEW_OPTION_SORT_METHOD,
            JSON.stringify(ViewFileOptions.SortMethod.NAME_ASC)
        );
        viewOptionsService.setSortMethod(ViewFileOptions.SortMethod.NAME_DESC);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            StorageKeys.VIEW_OPTION_SORT_METHOD,
            JSON.stringify(ViewFileOptions.SortMethod.NAME_DESC)
        );
    }));

    it("should forward updates to selectedStatusFilter", fakeAsync(() => {
        let count = 0;
        let selectedStatusFilter = null;
        viewOptionsService.options.subscribe({
            next: options => {
                selectedStatusFilter = options.selectedStatusFilter;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);

        viewOptionsService.setSelectedStatusFilter(ViewFile.Status.EXTRACTED);
        tick();
        expect(selectedStatusFilter).toBe(ViewFile.Status.EXTRACTED);
        expect(count).toBe(2);

        viewOptionsService.setSelectedStatusFilter(ViewFile.Status.QUEUED);
        tick();
        expect(selectedStatusFilter).toBe(ViewFile.Status.QUEUED);
        expect(count).toBe(3);

        // Setting same value shouldn't trigger an update
        viewOptionsService.setSelectedStatusFilter(ViewFile.Status.QUEUED);
        tick();
        expect(selectedStatusFilter).toBe(ViewFile.Status.QUEUED);
        expect(count).toBe(3);

        // Null should be allowed
        viewOptionsService.setSelectedStatusFilter(null);
        tick();
        expect(selectedStatusFilter).toBeNull();
        expect(count).toBe(4);
    }));

    it("should forward updates to nameFilter", fakeAsync(() => {
        let count = 0;
        let nameFilter = null;
        viewOptionsService.options.subscribe({
            next: options => {
                nameFilter = options.nameFilter;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);

        viewOptionsService.setNameFilter("tofu");
        tick();
        expect(nameFilter).toBe("tofu");
        expect(count).toBe(2);

        viewOptionsService.setNameFilter("flower");
        tick();
        expect(nameFilter).toBe("flower");
        expect(count).toBe(3);

        // Setting same value shouldn't trigger an update
        viewOptionsService.setNameFilter("flower");
        tick();
        expect(nameFilter).toBe("flower");
        expect(count).toBe(3);

        // Null should be allowed
        viewOptionsService.setNameFilter(null);
        tick();
        expect(nameFilter).toBeNull();
        expect(count).toBe(4);
    }));

    it("should forward updates to pinFilter", fakeAsync(() => {
        let count = 0;
        let pinFilter = null;
        viewOptionsService.options.subscribe({
            next: options => {
                pinFilter = options.pinFilter;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);

        viewOptionsService.setPinFilter(true);
        tick();
        expect(pinFilter).toBe(true);
        expect(count).toBe(2);

        viewOptionsService.setPinFilter(false);
        tick();
        expect(pinFilter).toBe(false);
        expect(count).toBe(3);

        // Setting same value shouldn't trigger an update
        viewOptionsService.setPinFilter(false);
        tick();
        expect(pinFilter).toBe(false);
        expect(count).toBe(3);
    }));

    it("should load pinFilter from storage", fakeAsync(() => {
        localStorageGetSpy.and.callFake((key: string) => {
            if (key === StorageKeys.VIEW_OPTION_PIN) {
                return JSON.stringify(true);
            }
            return null;
        });
        // Recreate the service
        viewOptionsService = createViewOptionsService();
        expect(localStorage.getItem).toHaveBeenCalledWith(StorageKeys.VIEW_OPTION_PIN);

        let count = 0;
        let pinFilter = null;
        viewOptionsService.options.subscribe({
            next: options => {
                pinFilter = options.pinFilter;
                count++;
            }
        });
        tick();
        expect(count).toBe(1);
        expect(pinFilter).toBe(true);
    }));

    it("should save pinFilter to storage", fakeAsync(() => {
        viewOptionsService.setPinFilter(true);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            StorageKeys.VIEW_OPTION_PIN,
            JSON.stringify(true)
        );
        viewOptionsService.setPinFilter(false);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            StorageKeys.VIEW_OPTION_PIN,
            JSON.stringify(false)
        );
    }));
});
