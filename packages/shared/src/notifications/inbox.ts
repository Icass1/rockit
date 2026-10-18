import type { NotificationResponse } from "@/dto";
import { BaseHttp } from "@/http/baseHttp";
import { atom } from "nanostores";

export class NotificationInbox {
    readonly items = atom<NotificationResponse[]>([]);
    readonly unread = atom(0);
    readonly total = atom(0);
    readonly error = atom("");
    private pending = false;
    private generation = 0;

    constructor(private readonly http: typeof BaseHttp) {}

    async refresh(append = false): Promise<void> {
        if (this.pending) return;
        this.pending = true;
        const generation = this.generation;
        try {
            const page = await this.http.listNotifications(
                20,
                append ? this.items.get().length : 0
            );
            if (generation !== this.generation) return;
            if (!page.isOk()) {
                this.error.set(page.message);
                return;
            }
            const previous = append ? this.items.get() : [];
            this.items.set([
                ...new Map(
                    [...previous, ...page.result.items].map((item) => [
                        item.publicId,
                        item,
                    ])
                ).values(),
            ]);
            this.unread.set(page.result.unreadCount);
            this.total.set(page.result.totalCount);
            this.error.set("");
        } catch {
            if (generation === this.generation)
                this.error.set("NOTIFICATION_LOAD_FAILED");
        } finally {
            this.pending = false;
        }
    }

    async read(publicId: string): Promise<void> {
        const generation = this.generation;
        const result = await this.http.markNotificationRead(publicId);
        if (generation !== this.generation) return;
        if (!result.isOk()) {
            this.error.set(result.message);
            return;
        }
        const wasUnread = this.items
            .get()
            .some((item) => item.publicId === publicId && item.readAt === null);
        const updated = result.result;
        this.items.set(
            this.items
                .get()
                .map((item) => (item.publicId === publicId ? updated : item))
        );
        if (wasUnread) this.unread.set(Math.max(0, this.unread.get() - 1));
    }

    async destination(publicId: string): Promise<string | null> {
        const result = await this.http.getNotificationDestination(publicId);
        return result.isOk() ? result.result.url : null;
    }

    clear(): void {
        this.generation++;
        this.items.set([]);
        this.unread.set(0);
        this.total.set(0);
        this.error.set("");
    }
}

export function notificationText(
    notification: NotificationResponse,
    vocabulary: object
): string {
    const entry = Object.entries(vocabulary).find(
        ([key]) => key === notification.vocabularyKey
    );
    const template: string =
        typeof entry?.[1] === "string" ? entry[1] : notification.vocabularyKey;
    return template.replace(
        /\{([^{}]+)\}/g,
        (gap: string, key: string): string =>
            notification.replacements.find(
                (replacement) => replacement.key === key
            )?.value ?? gap
    );
}
