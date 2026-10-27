import type {
    NotificationDestination,
    NotificationPageResponse,
    NotificationReplacement,
    Vocabulary,
} from "@rockit/shared";

export function unreadNotifications(page: NotificationPageResponse | null): NotificationPageResponse["items"] {
    if (!page?.unreadCount) return [];
    return page.items.filter((notification) => notification.readAt === null);
}



export function notificationVocabularyText(
    vocabulary: Vocabulary,
    key: string
): string {
    const entry = (vocabulary as unknown as Record<string, unknown>)[key];
    return typeof entry === "string" && entry !== key ? entry : vocabulary.NOTIFICATION_UNKNOWN;
}

export function replaceNotificationGaps(
    template: string,
    replacements: readonly NotificationReplacement[]
): string {
    return template.replace(
        /\{([^{}]+)\}/g,
        (gap: string, key: string) =>
            replacements.find((replacement) => replacement.key === key)
                ?.value ?? gap
    );
}

export function notificationPageHref(
    destination: NotificationDestination | null | undefined
): string | null {
    return destination?.path ?? null;
}
