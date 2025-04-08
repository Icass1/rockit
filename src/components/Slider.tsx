import { useRef, type ChangeEvent, type FC } from "react";

type ChangeEventHandler<T = Element> = (event: ChangeEvent<T>) => void;

interface SliderProps {
    value: number;
    onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
    max?: number;
    min?: number;
    step?: number;
    id: string;
    className?: string;
    readOnly?: boolean;
}

const Slider: FC<SliderProps> = ({
    value,
    onChange,
    max = 100,
    min = 0,
    step,
    id,
    className = "",
    readOnly = false,
}) => {
    const m = 100 / (max - min);
    const n = -m * min;

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            className={className + " relative w-16 rounded-full bg-neutral-700"}
        >
            {/* Barra de progreso */}
            <div
                className="absolute top-0 left-0 block h-full max-w-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                style={{ width: `${value * m + n}%` }}
            ></div>

            {/* Input tipo rango */}
            <input
                readOnly={readOnly}
                ref={inputRef}
                id={id}
                value={value}
                onChange={onChange}
                type="range"
                min={min}
                max={max}
                step={step}
                className="absolute left-0 h-full w-full cursor-pointer"
            />
        </div>
    );
};

export default Slider;
