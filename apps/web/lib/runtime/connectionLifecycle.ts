import type { RuntimeServices } from "@/models/interfaces/runtimeServices";

/** Owns shell integrations after the remaining legacy handlers are ready. */
export class ConnectionLifecycle {
    private unsubscribeSession?: () => void;
    private generation = 0;
    private ready = false;
    private username?: string;
    private startup?: Promise<void>;

    constructor(private readonly services: RuntimeServices) {}

    start(): Promise<void> {
        if (this.unsubscribeSession) return this.startup ?? Promise.resolve();
        const generation = ++this.generation;
        this.unsubscribeSession =
            this.services.userManager.sessionAtom.subscribe((session) => {
                const username = session?.username;
                if (username === this.username) return;
                this.services.webSocketManager.stop();
                this.username = username;
                if (this.ready && username)
                    this.services.webSocketManager.start();
            });
        this.services.notificationManager.start();
        this.services.friendManager.start();
        this.startup = this.services.init().then(() => {
            if (generation !== this.generation) return;
            this.services.bookmarkManager.start();
            this.services.navigationPinsManager.start();
            this.ready = true;
            if (this.username) this.services.webSocketManager.start();
        });
        return this.startup;
    }

    stop(): void {
        this.generation++;
        this.unsubscribeSession?.();
        this.unsubscribeSession = undefined;
        this.ready = false;
        this.username = undefined;
        this.startup = undefined;
        this.services.webSocketManager.stop();
        this.services.friendManager.stop();
        this.services.notificationManager.stop();
        this.services.bookmarkManager.stop();
        this.services.navigationPinsManager.stop();
    }
}
