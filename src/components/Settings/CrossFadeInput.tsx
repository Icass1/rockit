import { crossFade } from "@/stores/audio";
import { useStore } from "@nanostores/react";

export default function CrossFadeInput() {
    const $crossFade = useStore(crossFade);

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
            className="w-16 rounded p-2"
        />
    );
}
