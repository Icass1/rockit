"use client";

import { JSX, useRef, type ChangeEvent, type PointerEvent } from "react";

type ChangeEventHandler<T = Element> = (event: ChangeEvent<T>) => void;
type PointerEventHandler<T = Element> = (event: PointerEvent<T>) => void;

interface SliderProps {
    value: number;
    onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
    onPointerDown?: PointerEventHandler<HTMLInputElement> | undefined;
    onPointerUp?: PointerEventHandler<HTMLInputElement> | undefined;
    max?: number;
    min?: number;
    step?: number;
    id: string;
    className?: string;
    barClassName?: string;
    readOnly?: boolean;
    disabled?: boolean;
}

export default function Slider({
    value,
    onChange,
    onPointerDown,
    onPointerUp,
    max = 100,
    min = 0,
    step,
    id,
    className = "",
    barClassName = "bg-linear-to-r from-primary to-ring",
    readOnly = false,
    disabled = false,
}: SliderProps): JSX.Element {
    const widthPercentage =
        max <= min
            ? 0
            : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            className={
                className +
                " relative grid w-16 grid-cols-1 grid-rows-1 rounded-full"
            }
        >
            <div
                className={
                    "col-start-1 row-start-1 h-full max-w-full rounded-full " +
                    barClassName
                }
                style={{ width: `${widthPercentage}%` }}
            />

            <input
                readOnly={readOnly}
                disabled={disabled}
                ref={inputRef}
                id={id}
                value={value}
                onChange={onChange}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                type="range"
                min={min}
                max={max}
                step={step}
                className="col-start-1 row-start-1 h-full min-h-0 w-full min-w-0 cursor-pointer"
            />
        </div>
    );
}
