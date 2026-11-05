import type { RuntimeServices } from "@/models/interfaces/runtimeServices";

/** Owns shell integrations after the remaining legacy handlers are ready. */
export class ConnectionLifecycle {
    private unsubscribeSession?: () => void;
    private generation = 0;
    private ready = false;
    private username?: string;
    private queueOwner?: string;
    private queueGeneration = 0;
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
                this.queueGeneration++;
                this.services.queueManager.stop();
                if (this.queueOwner && this.queueOwner !== username)
                    this.services.queueManager.reset();
                this.queueOwner = username;
                this.username = username;
                if (this.ready && username) void this.connectQueueAsync();
            });
        const userStartup = this.services.userManager.start();
        this.services.notificationManager.start();
        this.services.friendManager.start();
        this.services.sharingManager.start();
        this.services.listenTogetherManager.start();
        this.startup = Promise.all([userStartup, this.services.init()]).then(
            async () => {
                if (generation !== this.generation) return;
                this.services.bookmarkManager.start();
                this.services.navigationPinsManager.start();
                this.ready = true;
                if (this.username) await this.connectQueueAsync();
            }
        );
        return this.startup;
    }

    private async connectQueueAsync(): Promise<void> {
        const generation = ++this.queueGeneration;
        await this.services.queueManager.init();
        if (generation === this.queueGeneration && this.ready && this.username)
            this.services.webSocketManager.start();
    }

    stop(): void {
        this.generation++;
        this.unsubscribeSession?.();
        this.unsubscribeSession = undefined;
        this.ready = false;
        this.username = undefined;
        this.startup = undefined;
        this.services.webSocketManager.stop();
        this.queueGeneration++;
        this.services.queueManager.stop();
        this.services.userManager.stop();
        this.services.listenTogetherManager.stop();
        this.services.sharingManager.stop();
        this.services.friendManager.stop();
        this.services.notificationManager.stop();
        this.services.bookmarkManager.stop();
        this.services.navigationPinsManager.stop();
    }
}
