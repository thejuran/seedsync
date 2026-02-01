import {ComponentFixture, TestBed, fakeAsync, tick} from "@angular/core/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {of} from "rxjs";
import {List} from "immutable";

import {FileListComponent} from "../../../../pages/files/file-list.component";
import {FileSelectionService} from "../../../../services/files/file-selection.service";
import {ViewFileService} from "../../../../services/files/view-file.service";
import {ViewFileOptionsService} from "../../../../services/files/view-file-options.service";
import {LoggerService} from "../../../../services/utils/logger.service";
import {ConfirmModalService} from "../../../../services/utils/confirm-modal.service";
import {NotificationService} from "../../../../services/utils/notification.service";
import {ViewFile} from "../../../../services/files/view-file";


describe("FileListComponent - Keyboard Shortcuts and Range Selection", () => {
    let component: FileListComponent;
    let fixture: ComponentFixture<FileListComponent>;
    let fileSelectionService: FileSelectionService;
    let mockViewFileService: jasmine.SpyObj<ViewFileService>;
    let mockViewFileOptionsService: jasmine.SpyObj<ViewFileOptionsService>;
    let mockLoggerService: jasmine.SpyObj<LoggerService>;
    let mockConfirmModalService: jasmine.SpyObj<ConfirmModalService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    // Test files
    const testFiles = List([
        new ViewFile({name: "file1"}),
        new ViewFile({name: "file2"}),
        new ViewFile({name: "file3"}),
        new ViewFile({name: "file4"}),
        new ViewFile({name: "file5"})
    ]);

    // Helper to get a file from testFiles by index with type safety
    function getFile(index: number): ViewFile {
        const file = testFiles.get(index);
        if (!file) {
            throw new Error(`Test file at index ${index} not found`);
        }
        return file;
    }

    beforeEach(async () => {
        mockViewFileService = jasmine.createSpyObj("ViewFileService", [
            "setSelected",
            "unsetSelected",
            "queue",
            "stop",
            "extract",
            "deleteLocal",
            "deleteRemote"
        ], {
            filteredFiles: of(testFiles)
        });

        mockViewFileOptionsService = jasmine.createSpyObj("ViewFileOptionsService", [], {
            options: of({showDetails: false})
        });

        mockLoggerService = jasmine.createSpyObj("LoggerService", ["info", "debug", "error"]);
        mockConfirmModalService = jasmine.createSpyObj("ConfirmModalService", ["confirm"]);
        mockNotificationService = jasmine.createSpyObj("NotificationService", ["show", "hide"]);

        await TestBed.configureTestingModule({
            imports: [FileListComponent, HttpClientTestingModule],
            providers: [
                FileSelectionService,
                {provide: ViewFileService, useValue: mockViewFileService},
                {provide: ViewFileOptionsService, useValue: mockViewFileOptionsService},
                {provide: LoggerService, useValue: mockLoggerService},
                {provide: ConfirmModalService, useValue: mockConfirmModalService},
                {provide: NotificationService, useValue: mockNotificationService}
            ]
        }).compileComponents();

        fileSelectionService = TestBed.inject(FileSelectionService);
        fixture = TestBed.createComponent(FileListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // =========================================================================
    // Keyboard Shortcut Tests - Ctrl/Cmd+A
    // =========================================================================

    describe("Ctrl+A keyboard shortcut", () => {
        it("should select all visible files when Ctrl+A is pressed", fakeAsync(() => {
            const event = new KeyboardEvent("keydown", {
                key: "a",
                ctrlKey: true,
                bubbles: true
            });

            // Spy on selectAllVisible
            spyOn(fileSelectionService, "selectAllVisible");

            component.onKeyDown(event);
            tick();

            expect(fileSelectionService.selectAllVisible).toHaveBeenCalledWith(testFiles.toArray());
        }));

        it("should select all visible files when Cmd+A is pressed (Mac)", fakeAsync(() => {
            const event = new KeyboardEvent("keydown", {
                key: "a",
                metaKey: true,
                bubbles: true
            });

            spyOn(fileSelectionService, "selectAllVisible");

            component.onKeyDown(event);
            tick();

            expect(fileSelectionService.selectAllVisible).toHaveBeenCalledWith(testFiles.toArray());
        }));

        it("should not select all when A is pressed without Ctrl/Cmd", () => {
            const event = new KeyboardEvent("keydown", {
                key: "a",
                ctrlKey: false,
                metaKey: false
            });

            spyOn(fileSelectionService, "selectAllVisible");

            component.onKeyDown(event);

            expect(fileSelectionService.selectAllVisible).not.toHaveBeenCalled();
        });

        it("should not intercept Ctrl+A when target is an input element", () => {
            const inputElement = document.createElement("input");
            const event = new KeyboardEvent("keydown", {
                key: "a",
                ctrlKey: true,
                bubbles: true
            });

            // Set target to input element
            Object.defineProperty(event, "target", {value: inputElement});

            spyOn(fileSelectionService, "selectAllVisible");

            component.onKeyDown(event);

            expect(fileSelectionService.selectAllVisible).not.toHaveBeenCalled();
        });

        it("should not intercept Ctrl+A when target is a textarea", () => {
            const textareaElement = document.createElement("textarea");
            const event = new KeyboardEvent("keydown", {
                key: "a",
                ctrlKey: true,
                bubbles: true
            });

            Object.defineProperty(event, "target", {value: textareaElement});

            spyOn(fileSelectionService, "selectAllVisible");

            component.onKeyDown(event);

            expect(fileSelectionService.selectAllVisible).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Keyboard Shortcut Tests - Escape
    // =========================================================================

    describe("Escape keyboard shortcut", () => {
        it("should clear selection when Escape is pressed", () => {
            // First select some files
            fileSelectionService.selectMultiple(["file1", "file2"]);
            expect(fileSelectionService.getSelectedCount()).toBe(2);

            const event = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true
            });

            component.onKeyDown(event);

            expect(fileSelectionService.getSelectedCount()).toBe(0);
        });

        it("should not clear selection when Escape is pressed in an input", () => {
            fileSelectionService.selectMultiple(["file1", "file2"]);

            const inputElement = document.createElement("input");
            const event = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true
            });

            Object.defineProperty(event, "target", {value: inputElement});

            component.onKeyDown(event);

            expect(fileSelectionService.getSelectedCount()).toBe(2);  // Unchanged
        });
    });

    // =========================================================================
    // Range Selection Tests - Shift+Click
    // =========================================================================

    describe("Shift+click range selection", () => {
        it("should select a range when shift+clicking after a normal click", () => {
            // Normal click on file2 (index 1)
            component.onCheckboxToggle({file: getFile(1), shiftKey: false});
            expect(fileSelectionService.isSelected("file2")).toBe(true);
            expect(fileSelectionService.getSelectedCount()).toBe(1);

            // Shift+click on file4 (index 3)
            component.onCheckboxToggle({file: getFile(3), shiftKey: true});

            // Should select range: file2, file3, file4
            expect(fileSelectionService.getSelectedCount()).toBe(3);
            expect(fileSelectionService.isSelected("file2")).toBe(true);
            expect(fileSelectionService.isSelected("file3")).toBe(true);
            expect(fileSelectionService.isSelected("file4")).toBe(true);
            // file1 and file5 should not be selected
            expect(fileSelectionService.isSelected("file1")).toBe(false);
            expect(fileSelectionService.isSelected("file5")).toBe(false);
        });

        it("should select a range in reverse order", () => {
            // Normal click on file4 (index 3)
            component.onCheckboxToggle({file: getFile(3), shiftKey: false});

            // Shift+click on file2 (index 1)
            component.onCheckboxToggle({file: getFile(1), shiftKey: true});

            // Should select range: file2, file3, file4
            expect(fileSelectionService.getSelectedCount()).toBe(3);
            expect(fileSelectionService.isSelected("file2")).toBe(true);
            expect(fileSelectionService.isSelected("file3")).toBe(true);
            expect(fileSelectionService.isSelected("file4")).toBe(true);
        });

        it("should replace previous selection when shift+clicking", () => {
            // Select file1
            component.onCheckboxToggle({file: getFile(0), shiftKey: false});
            expect(fileSelectionService.isSelected("file1")).toBe(true);

            // Click file3 (this is the anchor for range)
            component.onCheckboxToggle({file: getFile(2), shiftKey: false});

            // Shift+click file5 (should select file3, file4, file5 and clear file1)
            component.onCheckboxToggle({file: getFile(4), shiftKey: true});

            expect(fileSelectionService.getSelectedCount()).toBe(3);
            expect(fileSelectionService.isSelected("file1")).toBe(false);  // Cleared
            expect(fileSelectionService.isSelected("file2")).toBe(false);
            expect(fileSelectionService.isSelected("file3")).toBe(true);
            expect(fileSelectionService.isSelected("file4")).toBe(true);
            expect(fileSelectionService.isSelected("file5")).toBe(true);
        });

        it("should act as normal toggle when shift+clicking without previous click", () => {
            // Shift+click without previous click should just toggle
            component.onCheckboxToggle({file: getFile(2), shiftKey: true});

            expect(fileSelectionService.getSelectedCount()).toBe(1);
            expect(fileSelectionService.isSelected("file3")).toBe(true);
        });

        it("should select single file range when shift+clicking same file", () => {
            // Normal click on file2
            component.onCheckboxToggle({file: getFile(1), shiftKey: false});

            // Shift+click on same file
            component.onCheckboxToggle({file: getFile(1), shiftKey: true});

            // Should just have file2 selected
            expect(fileSelectionService.getSelectedCount()).toBe(1);
            expect(fileSelectionService.isSelected("file2")).toBe(true);
        });
    });

    // =========================================================================
    // Normal Toggle Tests
    // =========================================================================

    describe("Normal checkbox toggle", () => {
        it("should toggle selection on without shift", () => {
            component.onCheckboxToggle({file: getFile(0), shiftKey: false});

            expect(fileSelectionService.isSelected("file1")).toBe(true);
        });

        it("should toggle selection off without shift", () => {
            fileSelectionService.select("file1");

            component.onCheckboxToggle({file: getFile(0), shiftKey: false});

            expect(fileSelectionService.isSelected("file1")).toBe(false);
        });

        it("should update last clicked index on normal toggle", () => {
            // Click file3
            component.onCheckboxToggle({file: getFile(2), shiftKey: false});

            // Click file1
            component.onCheckboxToggle({file: getFile(0), shiftKey: false});

            // Shift+click file3 should select from file1 (last clicked) to file3
            component.onCheckboxToggle({file: getFile(2), shiftKey: true});

            expect(fileSelectionService.getSelectedCount()).toBe(3);
            expect(fileSelectionService.isSelected("file1")).toBe(true);
            expect(fileSelectionService.isSelected("file2")).toBe(true);
            expect(fileSelectionService.isSelected("file3")).toBe(true);
        });
    });

    // =========================================================================
    // Clear Selection Tests
    // =========================================================================

    describe("Clear selection", () => {
        it("should reset last clicked index when clearing selection", () => {
            // Click file2
            component.onCheckboxToggle({file: getFile(1), shiftKey: false});

            // Clear selection
            component.onClearSelection();

            // Shift+click should act as normal toggle since no anchor
            component.onCheckboxToggle({file: getFile(3), shiftKey: true});

            expect(fileSelectionService.getSelectedCount()).toBe(1);
            expect(fileSelectionService.isSelected("file4")).toBe(true);
        });

        it("should reset last clicked index when pressing Escape", () => {
            // Click file2
            component.onCheckboxToggle({file: getFile(1), shiftKey: false});

            // Press Escape
            const event = new KeyboardEvent("keydown", {key: "Escape"});
            component.onKeyDown(event);

            // Shift+click should act as normal toggle since no anchor
            component.onCheckboxToggle({file: getFile(3), shiftKey: true});

            expect(fileSelectionService.getSelectedCount()).toBe(1);
            expect(fileSelectionService.isSelected("file4")).toBe(true);
        });
    });
});
