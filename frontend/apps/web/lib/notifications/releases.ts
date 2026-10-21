import type { ReleaseAnnouncement } from "@/models/interfaces/notification";

// Newest first. Published entries are immutable; bump the version for new news.
export const RELEASES: ReleaseAnnouncement[] = [
    {
        version: "2.0.0",
        date: "2026-10-21",
        titleKey: "NOTIFICATIONS_RELEASE_TITLE",
        detailKey: "NOTIFICATIONS_RELEASE_DETAIL",
    },
];
