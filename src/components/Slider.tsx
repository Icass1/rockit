import { type ChangeEventHandler } from "react";

export default function Slider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    className = "",
    id,
}: {
    className?: string;
    value: number;
    onChange: ChangeEventHandler<HTMLInputElement> | undefined;
    max?: number;
    min?: number;
    step?: number;
    id: string;
}) {
    const m = 100 / (max - min);
    const n = -m * min;

    return (
        <div
            className={
                className + " relative w-16 h-[4.5px] rounded-full bg-gray-700"
            }
        >
            {/* Barra de progreso */}
            <div
                className="absolute block top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                style={{ width: `${value * m + n}%` }}
            ></div>

            {/* Input tipo rango */}
            <input
                id={id}
                value={value}
                onChange={onChange}
                type="range"
                min={min}
                max={max}
                step={step}
                className="absolute top-[-6px] left-0 w-full h-full cursor-pointer"
            />
        </div>
    );
}
