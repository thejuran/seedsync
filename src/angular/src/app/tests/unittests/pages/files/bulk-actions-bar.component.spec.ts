import {ComponentFixture, TestBed} from "@angular/core/testing";
import {List} from "immutable";

import {BulkActionsBarComponent, BulkActionCounts} from "../../../../pages/files/bulk-actions-bar.component";
import {ViewFile} from "../../../../services/files/view-file";


describe("BulkActionsBarComponent", () => {
    let component: BulkActionsBarComponent;
    let fixture: ComponentFixture<BulkActionsBarComponent>;

    // Test files with different action eligibility flags
    const testFiles = List([
        new ViewFile({
            name: "file1",
            isQueueable: true,
            isStoppable: false,
            isExtractable: false,
            isLocallyDeletable: false,
            isRemotelyDeletable: true
        }),
        new ViewFile({
            name: "file2",
            isQueueable: true,
            isStoppable: false,
            isExtractable: true,
            isLocallyDeletable: true,
            isRemotelyDeletable: true
        }),
        new ViewFile({
            name: "file3",
            isQueueable: false,
            isStoppable: true,
            isExtractable: false,
            isLocallyDeletable: false,
            isRemotelyDeletable: false
        }),
        new ViewFile({
            name: "file4",
            isQueueable: false,
            isStoppable: true,
            isExtractable: true,
            isLocallyDeletable: true,
            isRemotelyDeletable: false
        }),
        new ViewFile({
            name: "file5",
            isQueueable: true,
            isStoppable: false,
            isExtractable: true,
            isLocallyDeletable: true,
            isRemotelyDeletable: true
        })
    ]);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BulkActionsBarComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(BulkActionsBarComponent);
        component = fixture.componentInstance;
        component.visibleFiles = testFiles;
        fixture.detectChanges();
    });

    // =========================================================================
    // Visibility Tests
    // =========================================================================

    describe("Visibility", () => {
        it("should not show bar when no files are selected", () => {
            component.selectedFiles = new Set();
            expect(component.hasSelection).toBe(false);
        });

        it("should show bar when files are selected", () => {
            component.selectedFiles = new Set(["file1", "file2"]);
            expect(component.hasSelection).toBe(true);
        });

        it("should return correct selected count", () => {
            component.selectedFiles = new Set(["file1", "file2", "file3"]);
            expect(component.selectedCount).toBe(3);
        });
    });

    // =========================================================================
    // Action Counts Tests
    // =========================================================================

    describe("Action counts", () => {
        it("should calculate correct counts for selected files", () => {
            component.selectedFiles = new Set(["file1", "file2", "file3", "file4", "file5"]);
            const counts: BulkActionCounts = component.actionCounts;

            // file1, file2, file5 are queueable (3)
            expect(counts.queueable).toBe(3);
            // file3, file4 are stoppable (2)
            expect(counts.stoppable).toBe(2);
            // file2, file4, file5 are extractable (3)
            expect(counts.extractable).toBe(3);
            // file2, file4, file5 are locally deletable (3)
            expect(counts.locallyDeletable).toBe(3);
            // file1, file2, file5 are remotely deletable (3)
            expect(counts.remotelyDeletable).toBe(3);
        });

        it("should calculate counts only for selected files", () => {
            // Only select file1 and file3
            component.selectedFiles = new Set(["file1", "file3"]);
            const counts: BulkActionCounts = component.actionCounts;

            // file1 is queueable
            expect(counts.queueable).toBe(1);
            // file3 is stoppable
            expect(counts.stoppable).toBe(1);
            // Neither is extractable
            expect(counts.extractable).toBe(0);
            // Neither is locally deletable
            expect(counts.locallyDeletable).toBe(0);
            // file1 is remotely deletable
            expect(counts.remotelyDeletable).toBe(1);
        });

        it("should return zero counts when no files selected", () => {
            component.selectedFiles = new Set();
            const counts: BulkActionCounts = component.actionCounts;

            expect(counts.queueable).toBe(0);
            expect(counts.stoppable).toBe(0);
            expect(counts.extractable).toBe(0);
            expect(counts.locallyDeletable).toBe(0);
            expect(counts.remotelyDeletable).toBe(0);
        });

        it("should ignore selected files not in visible files", () => {
            component.selectedFiles = new Set(["file1", "nonexistent"]);
            const counts: BulkActionCounts = component.actionCounts;

            // Only file1 should be counted
            expect(counts.queueable).toBe(1);
            expect(counts.remotelyDeletable).toBe(1);
        });
    });

    // =========================================================================
    // File Getters Tests
    // =========================================================================

    describe("File getters", () => {
        beforeEach(() => {
            component.selectedFiles = new Set(["file1", "file2", "file3", "file4", "file5"]);
        });

        it("should return queueable file names", () => {
            const files = component.queueableFiles;
            expect(files).toContain("file1");
            expect(files).toContain("file2");
            expect(files).toContain("file5");
            expect(files.length).toBe(3);
        });

        it("should return stoppable file names", () => {
            const files = component.stoppableFiles;
            expect(files).toContain("file3");
            expect(files).toContain("file4");
            expect(files.length).toBe(2);
        });

        it("should return extractable file names", () => {
            const files = component.extractableFiles;
            expect(files).toContain("file2");
            expect(files).toContain("file4");
            expect(files).toContain("file5");
            expect(files.length).toBe(3);
        });

        it("should return locally deletable file names", () => {
            const files = component.locallyDeletableFiles;
            expect(files).toContain("file2");
            expect(files).toContain("file4");
            expect(files).toContain("file5");
            expect(files.length).toBe(3);
        });

        it("should return remotely deletable file names", () => {
            const files = component.remotelyDeletableFiles;
            expect(files).toContain("file1");
            expect(files).toContain("file2");
            expect(files).toContain("file5");
            expect(files.length).toBe(3);
        });
    });

    // =========================================================================
    // Click Handler Tests
    // =========================================================================

    describe("Click handlers", () => {
        beforeEach(() => {
            component.selectedFiles = new Set(["file1", "file2", "file5"]);
        });

        it("should emit queueAction with queueable files on Queue click", () => {
            spyOn(component.queueAction, "emit");

            component.onQueueClick();

            expect(component.queueAction.emit).toHaveBeenCalledWith(
                jasmine.arrayContaining(["file1", "file2", "file5"])
            );
        });

        it("should not emit queueAction when no queueable files", () => {
            component.selectedFiles = new Set(["file3", "file4"]);
            spyOn(component.queueAction, "emit");

            component.onQueueClick();

            expect(component.queueAction.emit).not.toHaveBeenCalled();
        });

        it("should emit stopAction with stoppable files on Stop click", () => {
            component.selectedFiles = new Set(["file3", "file4"]);
            spyOn(component.stopAction, "emit");

            component.onStopClick();

            expect(component.stopAction.emit).toHaveBeenCalledWith(
                jasmine.arrayContaining(["file3", "file4"])
            );
        });

        it("should not emit stopAction when no stoppable files", () => {
            spyOn(component.stopAction, "emit");

            component.onStopClick();

            expect(component.stopAction.emit).not.toHaveBeenCalled();
        });

        it("should emit extractAction with extractable files on Extract click", () => {
            component.selectedFiles = new Set(["file2", "file4", "file5"]);
            spyOn(component.extractAction, "emit");

            component.onExtractClick();

            expect(component.extractAction.emit).toHaveBeenCalledWith(
                jasmine.arrayContaining(["file2", "file4", "file5"])
            );
        });

        it("should not emit extractAction when no extractable files", () => {
            component.selectedFiles = new Set(["file1", "file3"]);
            spyOn(component.extractAction, "emit");

            component.onExtractClick();

            expect(component.extractAction.emit).not.toHaveBeenCalled();
        });

        it("should emit deleteLocalAction with locally deletable files on Delete Local click", () => {
            component.selectedFiles = new Set(["file2", "file4", "file5"]);
            spyOn(component.deleteLocalAction, "emit");

            component.onDeleteLocalClick();

            expect(component.deleteLocalAction.emit).toHaveBeenCalledWith(
                jasmine.arrayContaining(["file2", "file4", "file5"])
            );
        });

        it("should not emit deleteLocalAction when no locally deletable files", () => {
            component.selectedFiles = new Set(["file1", "file3"]);
            spyOn(component.deleteLocalAction, "emit");

            component.onDeleteLocalClick();

            expect(component.deleteLocalAction.emit).not.toHaveBeenCalled();
        });

        it("should emit deleteRemoteAction with remotely deletable files on Delete Remote click", () => {
            spyOn(component.deleteRemoteAction, "emit");

            component.onDeleteRemoteClick();

            expect(component.deleteRemoteAction.emit).toHaveBeenCalledWith(
                jasmine.arrayContaining(["file1", "file2", "file5"])
            );
        });

        it("should not emit deleteRemoteAction when no remotely deletable files", () => {
            component.selectedFiles = new Set(["file3", "file4"]);
            spyOn(component.deleteRemoteAction, "emit");

            component.onDeleteRemoteClick();

            expect(component.deleteRemoteAction.emit).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Edge Case Tests
    // =========================================================================

    describe("Edge cases", () => {
        it("should handle empty visible files list", () => {
            component.visibleFiles = List();
            component.selectedFiles = new Set(["file1"]);

            expect(component.selectedViewFiles).toEqual([]);
            expect(component.actionCounts.queueable).toBe(0);
        });

        it("should handle single file selection", () => {
            component.selectedFiles = new Set(["file1"]);
            const counts = component.actionCounts;

            expect(counts.queueable).toBe(1);
            expect(counts.stoppable).toBe(0);
            expect(counts.extractable).toBe(0);
            expect(counts.locallyDeletable).toBe(0);
            expect(counts.remotelyDeletable).toBe(1);
        });

        it("should return selected view files correctly", () => {
            component.selectedFiles = new Set(["file2", "file4"]);

            const selectedViewFiles = component.selectedViewFiles;

            expect(selectedViewFiles.length).toBe(2);
            expect(selectedViewFiles.map(f => f.name)).toContain("file2");
            expect(selectedViewFiles.map(f => f.name)).toContain("file4");
        });
    });
});
