declare let spyOn: any;

export class MockEventSource {
    url: string;
    onopen: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    // EventSource constants
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    readyState = 0;
    withCredentials = false;

    eventListeners: Map<string, EventListener> = new Map();

    constructor(url: string) {
        this.url = url;
    }

    addEventListener(type: string, listener: EventListener) {
        this.eventListeners.set(type, listener);
    }

    removeEventListener(type: string, listener: EventListener) {
        this.eventListeners.delete(type);
    }

    dispatchEvent(event: Event): boolean {
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
