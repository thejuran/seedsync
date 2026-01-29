declare let spyOn: any;

export class MockEventSource implements EventSource {
    // EventSource constants
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;

    // EventSource properties
    url: string;
    readyState: number = 0;
    withCredentials: boolean = false;
    onopen: ((this: EventSource, ev: Event) => any) | null = null;
    onerror: ((this: EventSource, ev: Event) => any) | null = null;
    onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;

    // Use EventListener (function type) for test compatibility
    eventListeners: Map<string, EventListener> = new Map();

    constructor(url: string) {
        this.url = url;
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, _options?: boolean | AddEventListenerOptions) {
        if (listener && typeof listener === 'function') {
            this.eventListeners.set(type, listener as EventListener);
        }
    }

    removeEventListener(type: string, _listener?: EventListenerOrEventListenerObject | null, _options?: boolean | EventListenerOptions) {
        this.eventListeners.delete(type);
    }

    dispatchEvent(_event: Event): boolean {
        return true;
    }

    close() {}
}

export function createMockEventSource(url: string): MockEventSource {
    let mockEventSource = new MockEventSource(url);
    spyOn(mockEventSource, 'addEventListener').and.callThrough();
    spyOn(mockEventSource, 'close').and.callThrough();
    return mockEventSource;
}
