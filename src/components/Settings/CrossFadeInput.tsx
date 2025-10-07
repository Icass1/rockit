import { rockIt } from "@/lib/rockit/rockIt";
import { useStore } from "@nanostores/react";

export default function CrossFadeInput() {
    const $crossFade = useStore(rockIt.audioManager.crossFadeAtom);

    return (
        <input
            id="cross-fade-input"
            type="number"
            value={$crossFade}
            onChange={(e) => {
                rockIt.userManager.setCrossFadeAsync(
                    Number(e.currentTarget.value)
                );
            }}
            max="40"
            min="0"
            className="w-16 rounded p-2"
        />
    );
}
