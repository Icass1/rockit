import { NotificationInbox } from "@rockit/shared";
import { Http } from "@/lib/http";

export const notificationInbox = new NotificationInbox(Http);
