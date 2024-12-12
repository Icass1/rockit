import type { ChangeEventHandler } from "react";
import styled from "styled-components";

const Input = styled.input`
    & {
        position: absolute;
        top: 0px;
        left: 0px;
        height: 100%;
        width: 100%;
        appearance: none;
        // background-color: rgb(55 65 80);
        background-color: transparent;
        border-radius: 9999px;
    }

    &:hover::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 10px;
        width: 10px;
        background-color: white;
    }

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        background-color: transparent;
        border-radius: 100%;
    }
    &::-webkit-slider-runnable-track {
    }
`;

export default function Slider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    className = "",
}: {
    className?: string;
    value: number;
    onChange: ChangeEventHandler<HTMLInputElement> | undefined;
    max?: number;
    min?: number;
    step?: number;
}) {
    const m = 100 / (max - min);
    const n = -m * min;

    return (
        <div
            className={
                className + " relative w-16 h-1 rounded-full bg-gray-700 "
            }
        >
            <div
                className="absolute block top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                style={{ width: `${value * m + n}%` }}
            ></div>
            <Input
                value={value}
                onChange={onChange}
                type="range"
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
}
