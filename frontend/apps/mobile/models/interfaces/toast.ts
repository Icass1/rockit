import { EToastType } from "@/models/enums/toastType";

export interface IToast {
    id: string;
    message: string;
    type: EToastType;
}
