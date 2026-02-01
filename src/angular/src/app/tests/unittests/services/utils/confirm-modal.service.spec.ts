import {fakeAsync, TestBed, tick} from "@angular/core/testing";

import {ConfirmModalService, ConfirmModalOptions} from "../../../../services/utils/confirm-modal.service";

describe("Testing confirm modal service", () => {
    let service: ConfirmModalService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ConfirmModalService
            ]
        });

        service = TestBed.inject(ConfirmModalService);
    });

    afterEach(() => {
        // Clean up any modals left in the DOM
        document.querySelectorAll(".modal").forEach(el => el.remove());
        document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
        document.body.classList.remove("modal-open");
    });

    it("should create an instance", () => {
        expect(service).toBeDefined();
    });

    it("should create modal with title and body", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test Title",
            body: "Test Body"
        };

        service.confirm(options);
        tick();

        const modal = document.querySelector(".modal");
        expect(modal).toBeTruthy();
        expect(modal.querySelector(".modal-title").textContent).toBe("Test Title");
        expect(modal.querySelector(".modal-body p").textContent).toBe("Test Body");
    }));

    it("should create backdrop", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        service.confirm(options);
        tick();

        const backdrop = document.querySelector(".modal-backdrop");
        expect(backdrop).toBeTruthy();
        expect(backdrop.classList.contains("show")).toBe(true);
    }));

    it("should add modal-open class to body", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        service.confirm(options);
        tick();

        expect(document.body.classList.contains("modal-open")).toBe(true);
    }));

    it("should resolve true when OK button is clicked", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        let result: boolean | undefined;
        service.confirm(options).then(r => result = r);
        tick();

        const okButton = document.querySelector("[data-action=\"ok\"]") as HTMLButtonElement;
        okButton.click();
        tick();

        expect(result).toBe(true);
    }));

    it("should resolve false when Cancel button is clicked", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        let result: boolean | undefined;
        service.confirm(options).then(r => result = r);
        tick();

        const cancelButton = document.querySelector("[data-action=\"cancel\"]") as HTMLButtonElement;
        cancelButton.click();
        tick();

        expect(result).toBe(false);
    }));

    it("should resolve false when backdrop is clicked", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        let result: boolean | undefined;
        service.confirm(options).then(r => result = r);
        tick();

        const modal = document.querySelector(".modal") as HTMLElement;
        modal.click();
        tick();

        expect(result).toBe(false);
    }));

    it("should not resolve when modal content is clicked", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        let result: boolean | undefined;
        service.confirm(options).then(r => result = r);
        tick();

        const modalContent = document.querySelector(".modal-content") as HTMLElement;
        modalContent.click();
        tick();

        expect(result).toBeUndefined();
    }));

    it("should remove modal and backdrop after closing", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        service.confirm(options);
        tick();

        const okButton = document.querySelector("[data-action=\"ok\"]") as HTMLButtonElement;
        okButton.click();
        tick();

        expect(document.querySelector(".modal")).toBeNull();
        expect(document.querySelector(".modal-backdrop")).toBeNull();
        expect(document.body.classList.contains("modal-open")).toBe(false);
    }));

    it("should use default button text", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        service.confirm(options);
        tick();

        const okButton = document.querySelector("[data-action=\"ok\"]");
        const cancelButton = document.querySelector("[data-action=\"cancel\"]");

        expect(okButton.textContent).toBe("OK");
        expect(cancelButton.textContent).toBe("Cancel");
    }));

    it("should use custom button text", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test",
            okBtn: "Delete",
            cancelBtn: "Keep"
        };

        service.confirm(options);
        tick();

        const okButton = document.querySelector("[data-action=\"ok\"]");
        const cancelButton = document.querySelector("[data-action=\"cancel\"]");

        expect(okButton.textContent).toBe("Delete");
        expect(cancelButton.textContent).toBe("Keep");
    }));

    it("should use default button classes", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        service.confirm(options);
        tick();

        const okButton = document.querySelector("[data-action=\"ok\"]");
        const cancelButton = document.querySelector("[data-action=\"cancel\"]");

        expect(okButton.classList.contains("btn")).toBe(true);
        expect(okButton.classList.contains("btn-primary")).toBe(true);
        expect(cancelButton.classList.contains("btn")).toBe(true);
        expect(cancelButton.classList.contains("btn-secondary")).toBe(true);
    }));

    it("should use custom button classes", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test",
            okBtnClass: "btn btn-danger",
            cancelBtnClass: "btn btn-outline-secondary"
        };

        service.confirm(options);
        tick();

        const okButton = document.querySelector("[data-action=\"ok\"]");
        const cancelButton = document.querySelector("[data-action=\"cancel\"]");

        expect(okButton.classList.contains("btn-danger")).toBe(true);
        expect(cancelButton.classList.contains("btn-outline-secondary")).toBe(true);
    }));

    it("should not show skip message when skipCount is not provided", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test"
        };

        service.confirm(options);
        tick();

        const modalBody = document.querySelector(".modal-body");
        expect(modalBody.querySelectorAll("p").length).toBe(1);
    }));

    it("should not show skip message when skipCount is 0", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test",
            skipCount: 0
        };

        service.confirm(options);
        tick();

        const modalBody = document.querySelector(".modal-body");
        expect(modalBody.querySelectorAll("p").length).toBe(1);
    }));

    it("should show skip message for single file", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test",
            skipCount: 1
        };

        service.confirm(options);
        tick();

        const modalBody = document.querySelector(".modal-body");
        const paragraphs = modalBody.querySelectorAll("p");
        expect(paragraphs.length).toBe(2);
        expect(paragraphs[1].textContent).toContain("1 file will be skipped");
    }));

    it("should show skip message for multiple files", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test",
            skipCount: 5
        };

        service.confirm(options);
        tick();

        const modalBody = document.querySelector(".modal-body");
        const paragraphs = modalBody.querySelectorAll("p");
        expect(paragraphs.length).toBe(2);
        expect(paragraphs[1].textContent).toContain("5 files will be skipped");
    }));

    it("should style skip message with muted text", fakeAsync(() => {
        const options: ConfirmModalOptions = {
            title: "Test",
            body: "Test",
            skipCount: 3
        };

        service.confirm(options);
        tick();

        const skipMessage = document.querySelectorAll(".modal-body p")[1];
        expect(skipMessage.classList.contains("text-muted")).toBe(true);
        expect(skipMessage.classList.contains("small")).toBe(true);
    }));
});
