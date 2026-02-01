import {TestBed} from "@angular/core/testing";

import {FileSelectionService} from "../../../../services/files/file-selection.service";
import {ViewFile} from "../../../../services/files/view-file";


describe("Testing file selection service", () => {
    let service: FileSelectionService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [FileSelectionService]
        });
        service = TestBed.inject(FileSelectionService);
    });

    // =========================================================================
    // Basic Selection Tests
    // =========================================================================

    it("should create an instance", () => {
        expect(service).toBeDefined();
    });

    it("should start with no selections", () => {
        expect(service.getSelectedCount()).toBe(0);
        expect(service.getSelectedFiles().size).toBe(0);
        expect(service.isSelectAllMatchingFilter()).toBe(false);
    });

    it("should select a file", () => {
        service.select("file1");

        expect(service.isSelected("file1")).toBe(true);
        expect(service.getSelectedCount()).toBe(1);
        expect(service.getSelectedFiles().has("file1")).toBe(true);
    });

    it("should not duplicate selection", () => {
        service.select("file1");
        service.select("file1");

        expect(service.getSelectedCount()).toBe(1);
    });

    it("should deselect a file", () => {
        service.select("file1");
        service.select("file2");

        service.deselect("file1");

        expect(service.isSelected("file1")).toBe(false);
        expect(service.isSelected("file2")).toBe(true);
        expect(service.getSelectedCount()).toBe(1);
    });

    it("should handle deselecting non-selected file", () => {
        service.deselect("nonexistent");

        expect(service.getSelectedCount()).toBe(0);
    });

    it("should toggle selection on", () => {
        service.toggle("file1");

        expect(service.isSelected("file1")).toBe(true);
    });

    it("should toggle selection off", () => {
        service.select("file1");
        service.toggle("file1");

        expect(service.isSelected("file1")).toBe(false);
    });

    it("should select multiple files", () => {
        service.selectMultiple(["file1", "file2", "file3"]);

        expect(service.getSelectedCount()).toBe(3);
        expect(service.isSelected("file1")).toBe(true);
        expect(service.isSelected("file2")).toBe(true);
        expect(service.isSelected("file3")).toBe(true);
    });

    it("should not duplicate when selecting multiple", () => {
        service.select("file1");
        service.selectMultiple(["file1", "file2"]);

        expect(service.getSelectedCount()).toBe(2);
    });

    // =========================================================================
    // Select All Tests
    // =========================================================================

    it("should select all visible files", () => {
        const files = [
            new ViewFile({name: "file1"}),
            new ViewFile({name: "file2"}),
            new ViewFile({name: "file3"})
        ];

        service.selectAllVisible(files);

        expect(service.getSelectedCount()).toBe(3);
        expect(service.isSelected("file1")).toBe(true);
        expect(service.isSelected("file2")).toBe(true);
        expect(service.isSelected("file3")).toBe(true);
        // Should NOT set selectAllMatching mode
        expect(service.isSelectAllMatchingFilter()).toBe(false);
    });

    it("should set selectAllMatchingFilter mode", () => {
        const files = [
            new ViewFile({name: "file1"}),
            new ViewFile({name: "file2"})
        ];

        service.selectAllMatchingFilter(files);

        expect(service.getSelectedCount()).toBe(2);
        expect(service.isSelectAllMatchingFilter()).toBe(true);
    });

    // =========================================================================
    // Clear Selection Tests
    // =========================================================================

    it("should clear all selections", () => {
        service.selectMultiple(["file1", "file2", "file3"]);

        service.clearSelection();

        expect(service.getSelectedCount()).toBe(0);
        expect(service.isSelected("file1")).toBe(false);
    });

    it("should clear selectAllMatchingFilter mode on clear", () => {
        const files = [new ViewFile({name: "file1"})];
        service.selectAllMatchingFilter(files);

        service.clearSelection();

        expect(service.isSelectAllMatchingFilter()).toBe(false);
    });

    it("should clear selectAllMatchingFilter mode on deselect", () => {
        const files = [
            new ViewFile({name: "file1"}),
            new ViewFile({name: "file2"})
        ];
        service.selectAllMatchingFilter(files);

        service.deselect("file1");

        expect(service.isSelectAllMatchingFilter()).toBe(false);
        expect(service.isSelected("file2")).toBe(true);
    });

    // =========================================================================
    // Set Selection Tests
    // =========================================================================

    it("should replace selection with setSelection", () => {
        service.selectMultiple(["file1", "file2"]);

        service.setSelection(["file3", "file4"]);

        expect(service.getSelectedCount()).toBe(2);
        expect(service.isSelected("file1")).toBe(false);
        expect(service.isSelected("file2")).toBe(false);
        expect(service.isSelected("file3")).toBe(true);
        expect(service.isSelected("file4")).toBe(true);
    });

    it("should clear selectAllMatchingFilter mode on setSelection", () => {
        const files = [new ViewFile({name: "file1"})];
        service.selectAllMatchingFilter(files);

        service.setSelection(["file2"]);

        expect(service.isSelectAllMatchingFilter()).toBe(false);
    });

    it("should select range (for shift+click)", () => {
        service.select("file1");

        service.selectRange(["file2", "file3", "file4"]);

        expect(service.getSelectedCount()).toBe(3);
        expect(service.isSelected("file1")).toBe(false);  // Previous cleared
        expect(service.isSelected("file2")).toBe(true);
        expect(service.isSelected("file3")).toBe(true);
        expect(service.isSelected("file4")).toBe(true);
    });

    // =========================================================================
    // Prune Selection Tests
    // =========================================================================

    it("should prune non-existent files from selection", () => {
        service.selectMultiple(["file1", "file2", "file3"]);

        service.pruneSelection(new Set(["file1", "file3"]));

        expect(service.getSelectedCount()).toBe(2);
        expect(service.isSelected("file1")).toBe(true);
        expect(service.isSelected("file2")).toBe(false);  // Pruned
        expect(service.isSelected("file3")).toBe(true);
    });

    it("should clear selectAllMatchingFilter when all selections pruned", () => {
        const files = [new ViewFile({name: "file1"})];
        service.selectAllMatchingFilter(files);

        service.pruneSelection(new Set<string>());

        expect(service.getSelectedCount()).toBe(0);
        expect(service.isSelectAllMatchingFilter()).toBe(false);
    });

    // =========================================================================
    // Observable Tests
    // =========================================================================

    it("should emit on selectedFiles$ when selection changes", (done) => {
        const emissions: Set<string>[] = [];

        service.selectedFiles$.subscribe(files => {
            emissions.push(files);
            if (emissions.length === 3) {
                // Initial empty, after select, after deselect
                expect(emissions[0].size).toBe(0);
                expect(emissions[1].size).toBe(1);
                expect(emissions[1].has("file1")).toBe(true);
                expect(emissions[2].size).toBe(0);
                done();
            }
        });

        service.select("file1");
        service.deselect("file1");
    });

    it("should emit on selectedCount$ when selection changes", (done) => {
        const emissions: number[] = [];

        service.selectedCount$.subscribe(count => {
            emissions.push(count);
            if (emissions.length === 3) {
                expect(emissions[0]).toBe(0);
                expect(emissions[1]).toBe(2);
                expect(emissions[2]).toBe(0);
                done();
            }
        });

        service.selectMultiple(["file1", "file2"]);
        service.clearSelection();
    });

    it("should emit on hasSelection$ when selection changes", (done) => {
        const emissions: boolean[] = [];

        service.hasSelection$.subscribe(has => {
            emissions.push(has);
            if (emissions.length === 3) {
                expect(emissions[0]).toBe(false);
                expect(emissions[1]).toBe(true);
                expect(emissions[2]).toBe(false);
                done();
            }
        });

        service.select("file1");
        service.clearSelection();
    });

    it("should emit on selectAllMatchingFilter$ when mode changes", (done) => {
        const emissions: boolean[] = [];

        service.selectAllMatchingFilter$.subscribe(mode => {
            emissions.push(mode);
            if (emissions.length === 3) {
                expect(emissions[0]).toBe(false);
                expect(emissions[1]).toBe(true);
                expect(emissions[2]).toBe(false);
                done();
            }
        });

        service.selectAllMatchingFilter([new ViewFile({name: "file1"})]);
        service.clearSelection();
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    it("should return new Set from getSelectedFiles to prevent mutation", () => {
        service.select("file1");

        const files1 = service.getSelectedFiles();
        const files2 = service.getSelectedFiles();

        expect(files1).not.toBe(files2);  // Different objects
        expect(files1).toEqual(files2);   // Same content
    });

    it("should handle empty array in selectMultiple", () => {
        service.select("file1");
        service.selectMultiple([]);

        expect(service.getSelectedCount()).toBe(1);
    });

    it("should handle empty array in selectAllVisible", () => {
        service.select("file1");
        service.selectAllVisible([]);

        expect(service.getSelectedCount()).toBe(1);
    });

    it("should not emit when no actual change occurs", (done) => {
        let emissionCount = 0;

        service.selectedFiles$.subscribe(() => {
            emissionCount++;
        });

        // Initial emission
        setTimeout(() => {
            expect(emissionCount).toBe(1);

            // Try to deselect non-existent file - should not emit
            service.deselect("nonexistent");

            setTimeout(() => {
                expect(emissionCount).toBe(1);  // Still 1
                done();
            }, 0);
        }, 0);
    });
});
