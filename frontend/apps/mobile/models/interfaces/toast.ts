import { EToastType } from "../enums/toastType";

export interface IToast {
    id: string;
    message: string;
    type: EToastType;
}
