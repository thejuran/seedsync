import {Injectable, Renderer2, RendererFactory2} from "@angular/core";

export interface ConfirmModalOptions {
    title: string;
    body: string;
    okBtn?: string;
    okBtnClass?: string;
    cancelBtn?: string;
    cancelBtnClass?: string;
    skipCount?: number;  // Number of items that will be skipped (for bulk actions)
}

@Injectable({
    providedIn: "root"
})
export class ConfirmModalService {
    private renderer: Renderer2;
    private modalElement: HTMLElement = null;
    private backdropElement: HTMLElement = null;

    constructor(rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);
    }

    confirm(options: ConfirmModalOptions): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.createModal(options, resolve);
        });
    }

    private createModal(options: ConfirmModalOptions, resolve: (value: boolean) => void): void {
        const okBtn = options.okBtn || "OK";
        const okBtnClass = options.okBtnClass || "btn btn-primary";
        const cancelBtn = options.cancelBtn || "Cancel";
        const cancelBtnClass = options.cancelBtnClass || "btn btn-secondary";

        // Build skip count message if provided
        let skipMessage = "";
        if (options.skipCount && options.skipCount > 0) {
            const plural = options.skipCount === 1 ? "" : "s";
            skipMessage = `<p class="text-muted small mt-2">${options.skipCount} file${plural} ` +
                `will be skipped (not eligible for this action)</p>`;
        }

        // Create backdrop
        this.backdropElement = this.renderer.createElement("div");
        this.renderer.addClass(this.backdropElement, "modal-backdrop");
        this.renderer.addClass(this.backdropElement, "fade");
        this.renderer.addClass(this.backdropElement, "show");
        this.renderer.appendChild(document.body, this.backdropElement);

        // Create modal
        this.modalElement = this.renderer.createElement("div");
        this.renderer.addClass(this.modalElement, "modal");
        this.renderer.addClass(this.modalElement, "fade");
        this.renderer.addClass(this.modalElement, "show");
        this.renderer.setStyle(this.modalElement, "display", "block");
        this.renderer.setAttribute(this.modalElement, "tabindex", "-1");
        this.renderer.setAttribute(this.modalElement, "role", "dialog");

        this.modalElement.innerHTML = `
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${options.title}</h5>
                    </div>
                    <div class="modal-body">
                        <p>${options.body}</p>
                        ${skipMessage}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="${cancelBtnClass}" data-action="cancel">${cancelBtn}</button>
                        <button type="button" class="${okBtnClass}" data-action="ok">${okBtn}</button>
                    </div>
                </div>
            </div>
        `;

        this.renderer.appendChild(document.body, this.modalElement);
        this.renderer.addClass(document.body, "modal-open");

        // Handle button clicks
        const cancelButton = this.modalElement.querySelector("[data-action=\"cancel\"]");
        const okButton = this.modalElement.querySelector("[data-action=\"ok\"]");

        const closeModal = (result: boolean) => {
            this.destroyModal();
            resolve(result);
        };

        cancelButton.addEventListener("click", () => closeModal(false));
        okButton.addEventListener("click", () => closeModal(true));

        // Close on backdrop click
        this.modalElement.addEventListener("click", (event) => {
            if (event.target === this.modalElement) {
                closeModal(false);
            }
        });
    }

    private destroyModal(): void {
        if (this.modalElement) {
            this.renderer.removeChild(document.body, this.modalElement);
            this.modalElement = null;
        }
        if (this.backdropElement) {
            this.renderer.removeChild(document.body, this.backdropElement);
            this.backdropElement = null;
        }
        this.renderer.removeClass(document.body, "modal-open");
    }
}
