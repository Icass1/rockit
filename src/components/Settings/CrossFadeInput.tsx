import { useEffect, useState } from "react";

export default function CorssFadeInput() {
    const [value, setValue] = useState<number>(0);

    useEffect(() => {
        const crossFadeLocalStorage = localStorage.getItem("crossFade");

        setValue(crossFadeLocalStorage ? Number(crossFadeLocalStorage) : 0);
    }, []);

    useEffect(() => {
        if (!value) {
            localStorage.setItem("crossFade", "0");
            return;
        }
        localStorage.setItem("crossFade", value?.toString());
    }, [value]);

    return (
        <input
            id="cross-fade-input"
            type="number"
            value={value}
            onChange={(e) => {
                setValue(Number(e.currentTarget.value));
            }}
            max="40"
            min="0"
            className="p-2 w-16 rounded"
        />
    );
}
