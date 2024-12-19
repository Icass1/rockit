import React, { useEffect, useRef } from 'react';

type ChangeEventHandler<T = Element> = (event: React.ChangeEvent<T>) => void;

interface SliderProps {
    value: number;
    onChange: ChangeEventHandler<HTMLInputElement> | undefined;
    max?: number;
    min?: number;
    step?: number;
    id: string;
    className?: string;
}

const Slider: React.FC<SliderProps> = ({
    value,
    onChange,
    max = 100,
    min = 0,
    step,
    id,
    className = ''
}) => {
    const m = 100 / (max - min);
    const n = -m * min;

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const inputElement = inputRef.current;
        if (inputElement) {
            const handleTouchStart = (event: TouchEvent) => {
                if (event.cancelable) {
                    event.preventDefault();
                }
            };

            inputElement.addEventListener('touchstart', handleTouchStart, { passive: false });

            return () => {
                inputElement.removeEventListener('touchstart', handleTouchStart);
            };
        }
    }, []);

    console.log(value, m, n);

    return (
        <div
            className={
                className + " relative w-16 h-[3px] md:h-[4.5px] rounded-full bg-gray-700"
            }
        >
            {/* Barra de progreso */}
            <div
                className="absolute block top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                style={{ width: `${value * m + n}%` }}
            ></div>

            {/* Input tipo rango */}
            <input
                ref={inputRef}
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
};

export default Slider;
