import {ComponentFixture, TestBed} from "@angular/core/testing";
import {signal, Signal} from "@angular/core";
import {EMPTY, of} from "rxjs";

import {SettingsPageComponent} from "../../../../pages/settings/settings-page.component";
import {ThemeService} from "../../../../services/theme/theme.service";
import {ThemeMode, ResolvedTheme} from "../../../../services/theme/theme.types";
import {LoggerService} from "../../../../services/utils/logger.service";
import {ConfigService} from "../../../../services/settings/config.service";
import {NotificationService} from "../../../../services/utils/notification.service";
import {ServerCommandService} from "../../../../services/server/server-command.service";
import {StreamServiceRegistry} from "../../../../services/base/stream-service.registry";
import {ConnectedService} from "../../../../services/utils/connected.service";

describe("SettingsPageComponent - Theme Toggle", () => {
    let component: SettingsPageComponent;
    let fixture: ComponentFixture<SettingsPageComponent>;
    let mockThemeService: {
        theme: Signal<ThemeMode>;
        resolvedTheme: Signal<ResolvedTheme>;
        setTheme: jasmine.Spy;
    };
    let themeSignal: ReturnType<typeof signal<ThemeMode>>;
    let resolvedThemeSignal: ReturnType<typeof signal<ResolvedTheme>>;

    beforeEach(async () => {
        // Create writable signals for mocking
        themeSignal = signal<ThemeMode>("auto");
        resolvedThemeSignal = signal<ResolvedTheme>("light");

        // Create mock ThemeService
        mockThemeService = {
            theme: themeSignal.asReadonly(),
            resolvedTheme: resolvedThemeSignal.asReadonly(),
            setTheme: jasmine.createSpy("setTheme")
        };

        // Create mock ConfigService
        const mockConfigService = jasmine.createSpyObj("ConfigService", ["set", "testSonarrConnection", "testRadarrConnection"]);
        mockConfigService.config = EMPTY;

        // Create mock ConnectedService
        const mockConnectedService = jasmine.createSpyObj("ConnectedService", [], {connected: of(true)});

        // Create mock StreamServiceRegistry
        const mockStreamServiceRegistry = jasmine.createSpyObj("StreamServiceRegistry", [], {
            connectedService: mockConnectedService
        });

        // Create mock LoggerService
        const mockLoggerService = jasmine.createSpyObj("LoggerService", ["info", "error"]);

        // Create mock NotificationService
        const mockNotificationService = jasmine.createSpyObj("NotificationService", ["show", "hide"]);

        // Create mock ServerCommandService
        const mockServerCommandService = jasmine.createSpyObj("ServerCommandService", ["restart"]);

        await TestBed.configureTestingModule({
            imports: [SettingsPageComponent],
            providers: [
                {provide: ThemeService, useValue: mockThemeService},
                {provide: LoggerService, useValue: mockLoggerService},
                {provide: ConfigService, useValue: mockConfigService},
                {provide: NotificationService, useValue: mockNotificationService},
                {provide: ServerCommandService, useValue: mockServerCommandService},
                {provide: StreamServiceRegistry, useValue: mockStreamServiceRegistry}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should render theme toggle button group", () => {
        const btnGroup = fixture.nativeElement.querySelector(".btn-group.theme-toggle");
        expect(btnGroup).toBeTruthy();

        const buttons = btnGroup.querySelectorAll("button");
        expect(buttons.length).toBe(3);
    });

    it("should show Light button as active when theme is light", () => {
        themeSignal.set("light");
        fixture.detectChanges();

        const buttons = fixture.nativeElement.querySelectorAll(".btn-group.theme-toggle button");
        const lightButton = buttons[0] as HTMLElement;
        const darkButton = buttons[1] as HTMLElement;
        const autoButton = buttons[2] as HTMLElement;

        expect(lightButton.classList.contains("active")).toBe(true);
        expect(lightButton.getAttribute("aria-pressed")).toBe("true");
        expect(darkButton.getAttribute("aria-pressed")).toBe("false");
        expect(autoButton.getAttribute("aria-pressed")).toBe("false");
    });

    it("should show Dark button as active when theme is dark", () => {
        themeSignal.set("dark");
        fixture.detectChanges();

        const buttons = fixture.nativeElement.querySelectorAll(".btn-group.theme-toggle button");
        const lightButton = buttons[0] as HTMLElement;
        const darkButton = buttons[1] as HTMLElement;
        const autoButton = buttons[2] as HTMLElement;

        expect(darkButton.classList.contains("active")).toBe(true);
        expect(lightButton.getAttribute("aria-pressed")).toBe("false");
        expect(darkButton.getAttribute("aria-pressed")).toBe("true");
        expect(autoButton.getAttribute("aria-pressed")).toBe("false");
    });

    it("should show Auto button as active when theme is auto", () => {
        themeSignal.set("auto");
        fixture.detectChanges();

        const buttons = fixture.nativeElement.querySelectorAll(".btn-group.theme-toggle button");
        const lightButton = buttons[0] as HTMLElement;
        const darkButton = buttons[1] as HTMLElement;
        const autoButton = buttons[2] as HTMLElement;

        expect(autoButton.classList.contains("active")).toBe(true);
        expect(lightButton.getAttribute("aria-pressed")).toBe("false");
        expect(darkButton.getAttribute("aria-pressed")).toBe("false");
        expect(autoButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should call setTheme when button clicked", () => {
        const buttons = fixture.nativeElement.querySelectorAll(".btn-group.theme-toggle button");
        const darkButton = buttons[1] as HTMLButtonElement;

        darkButton.click();

        expect(mockThemeService.setTheme).toHaveBeenCalledWith("dark");
    });

    it("should show resolved theme text when auto mode", () => {
        themeSignal.set("auto");
        resolvedThemeSignal.set("dark");
        fixture.detectChanges();

        const statusDiv = fixture.nativeElement.querySelector(".theme-status");
        expect(statusDiv).toBeTruthy();

        const statusText = statusDiv.textContent.trim();
        expect(statusText).toContain("Current theme: auto");
        expect(statusText).toContain("following system preference: dark");
    });

    it("should not show resolved theme text when not auto mode", () => {
        themeSignal.set("light");
        fixture.detectChanges();

        const statusDiv = fixture.nativeElement.querySelector(".theme-status");
        expect(statusDiv).toBeTruthy();

        const statusText = statusDiv.textContent.trim();
        expect(statusText).toContain("Current theme: light");
        expect(statusText).not.toContain("following system preference");
    });

    it("should have aria-hidden on all SVG icons", () => {
        const svgElements = fixture.nativeElement.querySelectorAll(".theme-toggle svg");
        expect(svgElements.length).toBe(3);

        svgElements.forEach((svg: HTMLElement) => {
            expect(svg.getAttribute("aria-hidden")).toBe("true");
        });
    });
});
