import {TestBed} from "@angular/core/testing";

import {FileSelectionService} from "../../../../services/files/file-selection.service";

describe("Testing file selection service", () => {
    let service: FileSelectionService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [FileSelectionService]
        });
        service = TestBed.inject(FileSelectionService);
    });

    it("should create an instance", () => {
        expect(service).toBeDefined();
    });

    describe("select/deselect/toggle", () => {
        it("selects a file", () => {
            service.select("file1");
            expect(service.isSelected("file1")).toBe(true);
            expect(service.getSelectedCount()).toBe(1);
        });

        it("does not duplicate selections", () => {
            service.select("file1");
            service.select("file1");
            expect(service.getSelectedCount()).toBe(1);
        });

        it("deselects a file", () => {
            service.select("file1");
            service.deselect("file1");
            expect(service.isSelected("file1")).toBe(false);
            expect(service.getSelectedCount()).toBe(0);
        });

        it("handles deselect on non-selected file", () => {
            service.deselect("file1");
            expect(service.isSelected("file1")).toBe(false);
            expect(service.getSelectedCount()).toBe(0);
        });

        it("toggles selection on", () => {
            service.toggle("file1");
            expect(service.isSelected("file1")).toBe(true);
        });

        it("toggles selection off", () => {
            service.select("file1");
            service.toggle("file1");
            expect(service.isSelected("file1")).toBe(false);
        });
    });

    describe("selectMultiple", () => {
        it("selects multiple files", () => {
            service.selectMultiple(["file1", "file2", "file3"]);
            expect(service.isSelected("file1")).toBe(true);
            expect(service.isSelected("file2")).toBe(true);
            expect(service.isSelected("file3")).toBe(true);
            expect(service.getSelectedCount()).toBe(3);
        });

        it("does not duplicate when selecting multiple", () => {
            service.select("file1");
            service.selectMultiple(["file1", "file2"]);
            expect(service.getSelectedCount()).toBe(2);
        });
    });

    describe("selectAllVisible", () => {
        it("selects all visible files", () => {
            service.selectAllVisible(["file1", "file2", "file3"]);
            expect(service.getSelectedCount()).toBe(3);
            expect(service.getSelectedFiles()).toEqual(
                jasmine.arrayContaining(["file1", "file2", "file3"])
            );
        });

        it("replaces existing selection", () => {
            service.select("file0");
            service.selectAllVisible(["file1", "file2"]);
            expect(service.isSelected("file0")).toBe(false);
            expect(service.getSelectedCount()).toBe(2);
        });
    });

    describe("clearSelection", () => {
        it("clears all selections", () => {
            service.selectMultiple(["file1", "file2", "file3"]);
            service.clearSelection();
            expect(service.getSelectedCount()).toBe(0);
        });

        it("clears selectAllMatching flag", () => {
            service.setSelectAllMatchingFilter(true);
            service.clearSelection();
            expect(service.isSelectAllMatching()).toBe(false);
        });

        it("handles clearing empty selection", () => {
            service.clearSelection();
            expect(service.getSelectedCount()).toBe(0);
        });
    });

    describe("selectAllMatching", () => {
        it("sets selectAllMatching flag", () => {
            service.setSelectAllMatchingFilter(true);
            expect(service.isSelectAllMatching()).toBe(true);
        });

        it("clears selectAllMatching on deselect", () => {
            service.selectAllVisible(["file1", "file2"]);
            service.setSelectAllMatchingFilter(true);
            service.deselect("file1");
            expect(service.isSelectAllMatching()).toBe(false);
        });
    });

    describe("pruneSelection", () => {
        it("removes non-existent files from selection", () => {
            service.selectMultiple(["file1", "file2", "file3"]);
            service.pruneSelection(new Set(["file1", "file3"]));
            expect(service.isSelected("file1")).toBe(true);
            expect(service.isSelected("file2")).toBe(false);
            expect(service.isSelected("file3")).toBe(true);
            expect(service.getSelectedCount()).toBe(2);
        });

        it("does nothing when all files exist", () => {
            service.selectMultiple(["file1", "file2"]);
            service.pruneSelection(new Set(["file1", "file2", "file3"]));
            expect(service.getSelectedCount()).toBe(2);
        });
    });

    describe("observables", () => {
        it("emits on selectedFiles$", (done) => {
            let emissions = 0;
            service.selectedFiles$.subscribe(files => {
                emissions++;
                if (emissions === 2) {
                    expect(files.has("file1")).toBe(true);
                    done();
                }
            });
            service.select("file1");
        });

        it("emits on selectedCount$", (done) => {
            let emissions = 0;
            service.selectedCount$.subscribe(count => {
                emissions++;
                if (emissions === 2) {
                    expect(count).toBe(1);
                    done();
                }
            });
            service.select("file1");
        });

        it("emits on hasSelection$", (done) => {
            let emissions = 0;
            service.hasSelection$.subscribe(hasSelection => {
                emissions++;
                if (emissions === 2) {
                    expect(hasSelection).toBe(true);
                    done();
                }
            });
            service.select("file1");
        });

        it("emits on selectAllMatching$", (done) => {
            let emissions = 0;
            service.selectAllMatching$.subscribe(value => {
                emissions++;
                if (emissions === 2) {
                    expect(value).toBe(true);
                    done();
                }
            });
            service.setSelectAllMatchingFilter(true);
        });
    });
});
