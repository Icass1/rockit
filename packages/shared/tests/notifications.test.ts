import assert from "node:assert/strict";
import test from "node:test";
import type {
    NotificationPageResponse,
    NotificationResponse,
} from "../src/dto";
import { BaseHttp } from "../src/http/baseHttp";
import { HttpResult } from "../src/models/types/httpTypes";
import {
    NotificationInbox,
    notificationText,
} from "../src/notifications/inbox";

const item: NotificationResponse = {
    publicId: "notice",
    eventKey: "APPLICATION_MESSAGE",
    vocabularyKey: "MESSAGE",
    replacements: [{ key: "MESSAGE", value: "literal {MESSAGE} <script>" }],
    dateAdded: "2026-01-01T00:00:00Z",
    readAt: null,
    destination: null,
};
class TestHttp extends BaseHttp {
    static override async listNotifications(): Promise<
        HttpResult<NotificationPageResponse>
    > {
        return new HttpResult({
            ok: true,
            code: 200,
            message: "OK",
            result: { items: [item], unreadCount: 1, totalCount: 1 },
        });
    }
    static override async markNotificationRead(): Promise<
        HttpResult<NotificationResponse>
    > {
        return new HttpResult({
            ok: true,
            code: 200,
            message: "OK",
            result: { ...item, readAt: "2026-01-02T00:00:00Z" },
        });
    }
}
test("notification replacements are literal and single-pass", () => {
    assert.equal(
        notificationText(item, { MESSAGE: "Content: {MESSAGE}" }),
        "Content: literal {MESSAGE} <script>"
    );
});
test("inbox loads, deduplicates, marks read once, and clears account state", async () => {
    const inbox = new NotificationInbox(TestHttp);
    await inbox.refresh();
    await inbox.refresh(true);
    assert.equal(inbox.items.get().length, 1);
    assert.equal(inbox.unread.get(), 1);
    await inbox.read("notice");
    await inbox.read("notice");
    assert.equal(inbox.unread.get(), 0);
    inbox.clear();
    assert.deepEqual(inbox.items.get(), []);
    assert.equal(inbox.total.get(), 0);
});
