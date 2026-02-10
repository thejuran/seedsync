import {AfterViewInit, Component, ElementRef, OnInit, OnDestroy, ViewChild} from "@angular/core";
import {NavigationEnd, Router, RouterOutlet} from "@angular/router";
import {NgFor, NgIf, NgClass} from "@angular/common";
import {Subscription} from "rxjs";
import {ROUTE_INFOS, RouteInfo} from "../../routes";

import {ElementQueries, ResizeSensor} from "css-element-queries";
import {DomService} from "../../services/utils/dom.service";
import {ToastService, Toast} from "../../services/utils/toast.service";
import {HeaderComponent} from "./header.component";
import {SidebarComponent} from "./sidebar.component";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, SidebarComponent, NgFor, NgIf, NgClass]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("topHeader", {static: false}) topHeader: ElementRef;

    showSidebar = false;
    toasts: Toast[] = [];
    private _toastSubscription: Subscription;
    activeRoute: RouteInfo;

    constructor(private router: Router,
                private _domService: DomService,
                private _toastService: ToastService) {
        // Navigation listener
        //    Close the sidebar
        //    Store the active route
        router.events.subscribe(() => {
            this.showSidebar = false;
            this.activeRoute = ROUTE_INFOS.find(value => "/" + value.path === router.url);
        });
    }

    ngOnInit(): void {
        // Scroll to top on route changes
        this.router.events.subscribe((evt) => {
            if (!(evt instanceof NavigationEnd)) {
                return;
            }
            window.scrollTo(0, 0);
        });

        // Subscribe to toast notifications
        this._toastSubscription = this._toastService.toasts$.subscribe(toast => {
            this.toasts.push(toast);
            if (toast.autohide) {
                setTimeout(() => {
                    const index = this.toasts.indexOf(toast);
                    if (index >= 0) {
                        this.toasts.splice(index, 1);
                    }
                }, toast.delay);
            }
        });
    }

    ngAfterViewInit(): void {
        ElementQueries.listen();
        ElementQueries.init();
        // noinspection TsLint
        new ResizeSensor(this.topHeader.nativeElement, () => {
            this._domService.setHeaderHeight(this.topHeader.nativeElement.clientHeight);
        });
    }

    ngOnDestroy(): void {
        if (this._toastSubscription) {
            this._toastSubscription.unsubscribe();
        }
    }

    dismissToast(toast: Toast): void {
        const index = this.toasts.indexOf(toast);
        if (index >= 0) {
            this.toasts.splice(index, 1);
        }
    }

    title = "app";
}
