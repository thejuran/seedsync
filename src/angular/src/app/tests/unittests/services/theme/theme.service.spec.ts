import {fakeAsync, TestBed, tick} from "@angular/core/testing";

import {ThemeService} from "../../../../services/theme/theme.service";
import {ThemeMode, THEME_STORAGE_KEY} from "../../../../services/theme/theme.types";


describe("Testing theme service", () => {
    let service: ThemeService;
    let mockMediaQuery: MediaQueryList & {_triggerChange: (newMatches: boolean) => void; _setMatches: (value: boolean) => void};
    let mockMatchMedia: jasmine.Spy;
    let mockLocalStorageGetItem: jasmine.Spy;
    let mockLocalStorageSetItem: jasmine.Spy;
    let mockDocumentSetAttribute: jasmine.Spy;
    let mockConsoleWarn: jasmine.Spy;

    /**
     * Helper to create a mock MediaQueryList with controllable matches property
     */
    function createMockMediaQueryList(matches: boolean): MediaQueryList & {_triggerChange: (newMatches: boolean) => void; _setMatches: (value: boolean) => void} {
        const listeners: Array<(event: MediaQueryListEvent) => void> = [];
        let currentMatches = matches;

        const mock = {
            get matches(): boolean {
                return currentMatches;
            },
            set matches(value: boolean) {
                currentMatches = value;
            },
            media: "(prefers-color-scheme: dark)",
            onchange: null,
            addEventListener: jasmine.createSpy("addEventListener").and.callFake(
                (type: string, listener: (event: MediaQueryListEvent) => void): void => {
                    if (type === "change") {
                        listeners.push(listener);
                    }
                }
            ),
            removeEventListener: jasmine.createSpy("removeEventListener").and.callFake(
                (type: string, listener: (event: MediaQueryListEvent) => void): void => {
                    if (type === "change") {
                        const index = listeners.indexOf(listener);
                        if (index !== -1) {
                            listeners.splice(index, 1);
                        }
                    }
                }
            ),
            addListener: jasmine.createSpy("addListener"),
            removeListener: jasmine.createSpy("removeListener"),
            dispatchEvent: jasmine.createSpy("dispatchEvent"),
            // Helper to update matches without triggering listeners
            _setMatches: (value: boolean): void => {
                currentMatches = value;
            },
            // Helper to simulate OS preference change
            _triggerChange: (newMatches: boolean): void => {
                currentMatches = newMatches;
                const event = {matches: newMatches} as MediaQueryListEvent;
                listeners.forEach(listener => listener(event));
            }
        };
        return mock as unknown as MediaQueryList & {_triggerChange: (newMatches: boolean) => void; _setMatches: (value: boolean) => void};
    }

    /**
     * Helper to trigger storage event
     */
    function triggerStorageEvent(key: string | null, newValue: string | null): void {
        const event = new StorageEvent("storage", {key, newValue});
        window.dispatchEvent(event);
    }

    /**
     * Set up fresh mocks before each test.
     * Mocks MUST be configured before TestBed.inject() because constructor runs immediately.
     */
    function setupMocks(
        localStorageValue: string | null = null,
        prefersDark: boolean = false,
        localStorageThrows: boolean = false
    ): void {
        // Mock localStorage
        mockLocalStorageGetItem = spyOn(localStorage, "getItem");
        mockLocalStorageSetItem = spyOn(localStorage, "setItem");

        if (localStorageThrows) {
            mockLocalStorageGetItem.and.throwError("localStorage not available");
            mockLocalStorageSetItem.and.throwError("localStorage not available");
        } else {
            mockLocalStorageGetItem.and.returnValue(localStorageValue);
            mockLocalStorageSetItem.and.stub();
        }

        // Mock window.matchMedia
        mockMediaQuery = createMockMediaQueryList(prefersDark);
        mockMatchMedia = spyOn(window, "matchMedia").and.returnValue(mockMediaQuery);

        // Mock document.documentElement.setAttribute
        mockDocumentSetAttribute = spyOn(document.documentElement, "setAttribute");

        // Mock console.warn
        mockConsoleWarn = spyOn(console, "warn");
    }

    afterEach(() => {
        // Clean up service to prevent listener leaks
        if (service) {
            service.ngOnDestroy();
        }
    });

    describe("Initialization", () => {
        it("should initialize with 'auto' mode when localStorage is empty", () => {
            setupMocks(null, false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("auto");
            expect(mockLocalStorageGetItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
        });

        it("should initialize with 'dark' when localStorage has 'dark'", () => {
            setupMocks("dark", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("dark");
        });

        it("should initialize with 'light' when localStorage has 'light'", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");
        });

        it("should initialize with 'auto' when localStorage has 'auto'", () => {
            setupMocks("auto", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("auto");
        });

        it("should default to 'auto' when localStorage has invalid value", () => {
            setupMocks("invalid-theme", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("auto");
        });

        it("should default to 'auto' when localStorage throws (private browsing)", () => {
            setupMocks(null, false, true);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("auto");
            expect(mockConsoleWarn).toHaveBeenCalled();
        });
    });

    describe("Resolved theme computation", () => {
        it("should return 'light' when mode is 'light'", () => {
            setupMocks("light", true); // OS prefers dark, but mode is light

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("light");
        });

        it("should return 'dark' when mode is 'dark'", () => {
            setupMocks("dark", false); // OS prefers light, but mode is dark

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("dark");
        });

        it("should return 'dark' when mode is 'auto' and OS prefers dark", () => {
            setupMocks("auto", true);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("dark");
        });

        it("should return 'light' when mode is 'auto' and OS prefers light", () => {
            setupMocks("auto", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("light");
        });
    });

    describe("DOM attribute application", () => {
        it("should set data-bs-theme attribute on initialization", () => {
            setupMocks("dark", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(mockDocumentSetAttribute).toHaveBeenCalledWith("data-bs-theme", "dark");
        });

        it("should update data-bs-theme attribute when setTheme is called with 'dark'", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            mockDocumentSetAttribute.calls.reset();

            service.setTheme("dark");
            TestBed.flushEffects();

            expect(mockDocumentSetAttribute).toHaveBeenCalledWith("data-bs-theme", "dark");
        });

        it("should update data-bs-theme attribute when setTheme is called with 'light'", () => {
            setupMocks("dark", true);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            mockDocumentSetAttribute.calls.reset();

            service.setTheme("light");
            TestBed.flushEffects();

            expect(mockDocumentSetAttribute).toHaveBeenCalledWith("data-bs-theme", "light");
        });

        it("should update data-bs-theme to resolved theme when setTheme is called with 'auto'", () => {
            setupMocks("light", true); // OS prefers dark

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            mockDocumentSetAttribute.calls.reset();

            service.setTheme("auto");
            TestBed.flushEffects();

            // Should resolve 'auto' to 'dark' because OS prefers dark
            expect(mockDocumentSetAttribute).toHaveBeenCalledWith("data-bs-theme", "dark");
        });
    });

    describe("setTheme method", () => {
        it("should update theme signal when setTheme('dark') is called", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            service.setTheme("dark");
            TestBed.flushEffects();

            expect(service.theme()).toBe("dark");
        });

        it("should persist to localStorage when setTheme is called", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            mockLocalStorageSetItem.calls.reset();

            service.setTheme("dark");
            TestBed.flushEffects();

            expect(mockLocalStorageSetItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");
        });

        it("should not throw when localStorage.setItem throws", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            mockLocalStorageSetItem.and.throwError("localStorage not available");

            expect(() => {
                service.setTheme("dark");
                TestBed.flushEffects();
            }).not.toThrow();

            expect(mockConsoleWarn).toHaveBeenCalled();
        });
    });

    describe("Multi-tab synchronization", () => {
        it("should register storage event listener on window during construction", () => {
            setupMocks("light", false);

            const addEventListenerSpy = spyOn(window, "addEventListener");

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                "storage",
                jasmine.any(Function)
            );
        });

        it("should update theme when storage event fires with 'dark'", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");

            triggerStorageEvent(THEME_STORAGE_KEY, "dark");
            TestBed.flushEffects();

            expect(service.theme()).toBe("dark");
        });

        it("should update theme when storage event fires with 'light'", () => {
            setupMocks("dark", true);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("dark");

            triggerStorageEvent(THEME_STORAGE_KEY, "light");
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");
        });

        it("should update theme when storage event fires with 'auto'", () => {
            setupMocks("dark", true);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("dark");

            triggerStorageEvent(THEME_STORAGE_KEY, "auto");
            TestBed.flushEffects();

            expect(service.theme()).toBe("auto");
        });

        it("should ignore storage event with different key", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");

            triggerStorageEvent("other-key", "dark");
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");
        });

        it("should ignore storage event with null newValue", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");

            triggerStorageEvent(THEME_STORAGE_KEY, null);
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");
        });

        it("should ignore storage event with invalid theme value", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");

            triggerStorageEvent(THEME_STORAGE_KEY, "invalid-theme");
            TestBed.flushEffects();

            expect(service.theme()).toBe("light");
        });
    });

    describe("OS preference change detection", () => {
        it("should register change listener on MediaQueryList during construction", () => {
            setupMocks("auto", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
                "change",
                jasmine.any(Function)
            );
        });

        it("should update resolvedTheme when OS preference changes while in 'auto' mode", fakeAsync(() => {
            setupMocks("auto", false); // Initially prefers light

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("light");

            // Simulate OS change to dark mode
            mockMediaQuery._triggerChange(true);
            tick();
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("dark");
        }));

        it("should update resolvedTheme from dark to light when OS preference changes while in 'auto' mode", fakeAsync(() => {
            setupMocks("auto", true); // Initially prefers dark

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("dark");

            // Simulate OS change to light mode
            mockMediaQuery._triggerChange(false);
            tick();
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("light");
        }));

        it("should not react to OS preference changes when in 'light' mode", () => {
            setupMocks("light", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("light");

            // Simulate OS change to dark mode
            mockMediaQuery._triggerChange(true);
            TestBed.flushEffects();

            // Should stay light because mode is explicitly 'light'
            expect(service.resolvedTheme()).toBe("light");
        });

        it("should not react to OS preference changes when in 'dark' mode", () => {
            setupMocks("dark", true);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            expect(service.resolvedTheme()).toBe("dark");

            // Simulate OS change to light mode
            mockMediaQuery._triggerChange(false);
            TestBed.flushEffects();

            // Should stay dark because mode is explicitly 'dark'
            expect(service.resolvedTheme()).toBe("dark");
        });
    });

    describe("Cleanup", () => {
        it("should remove storage event listener on ngOnDestroy", () => {
            setupMocks("light", false);

            const removeEventListenerSpy = spyOn(window, "removeEventListener");

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            service.ngOnDestroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                "storage",
                jasmine.any(Function)
            );
        });

        it("should remove media query change listener on ngOnDestroy", () => {
            setupMocks("auto", false);

            service = TestBed.inject(ThemeService);
            TestBed.flushEffects();

            service.ngOnDestroy();

            expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
                "change",
                jasmine.any(Function)
            );
        });
    });
});
