import { crossFade } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";

export default function CrossFadeInput() {
    const $crossFade = useStore(crossFade);

    useEffect(() => {
        const crossFadeLocalStorage = localStorage.getItem("crossFade");

        crossFade.set(
            crossFadeLocalStorage ? Number(crossFadeLocalStorage) : 0
        );
    }, []);

    useEffect(() => {
        if (!$crossFade) {
            localStorage.setItem("crossFade", "0");
            return;
        }
        localStorage.setItem("crossFade", $crossFade?.toString());
    }, [$crossFade]);

    return (
        <input
            id="cross-fade-input"
            type="number"
            value={$crossFade}
            onChange={(e) => {
                crossFade.set(Number(e.currentTarget.value));
            }}
            max="40"
            min="0"
            className="p-2 w-16 rounded"
        />
    );
}
