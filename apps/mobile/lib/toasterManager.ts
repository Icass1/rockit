import { atom } from "nanostores";
import { EToastType } from "@/models/enums/toastType";
import { IToast } from "@/models/interfaces/toast";

class ToasterManager {
    private _toastsAtom = atom<IToast[]>([]);
    private _nextId = 0;
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    private _show(message: string, type: EToastType) {
        const id = String(this._nextId++);
        const current = this._toastsAtom.get();
        this._toastsAtom.set([...current.slice(-4), { id, message, type }]);
        this.timers.set(
            id,
            setTimeout(() => this.dismiss(id), 4000)
        );
    }

    notifyError(message: string) {
        this._show(message, EToastType.ERROR);
    }

    notifyInfo(message: string) {
        this._show(message, EToastType.INFO);
    }

    notifyWarn(message: string) {
        this._show(message, EToastType.WARN);
    }

    notifySuccess(message: string) {
        this._show(message, EToastType.SUCCESS);
    }

    clear(): void {
        for (const timer of this.timers.values()) clearTimeout(timer);
        this.timers.clear();
        this._toastsAtom.set([]);
    }

    dismiss(id: string) {
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
        const current = this._toastsAtom.get();
        this._toastsAtom.set(current.filter((t) => t.id !== id));
    }

    get toastsAtom() {
        return this._toastsAtom;
    }
}

export const toasterManager = new ToasterManager();
