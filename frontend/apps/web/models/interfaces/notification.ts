import { ENotificationType } from "@/models/enums/notificationType";

export interface INotification {
    id: number;
    message: string;
    type: ENotificationType;
}
