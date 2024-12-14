import { useEffect, useRef, type ChangeEventHandler } from "react";
import styled from "styled-components";
import type {
    FastOmit,
    IStyledComponentBase,
} from "styled-components/dist/types";

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

    const StyledInput = useRef<
        IStyledComponentBase<
            "web",
            FastOmit<
                React.DetailedHTMLProps<
                    React.InputHTMLAttributes<HTMLInputElement>,
                    HTMLInputElement
                >,
                never
            >
        > &
            string
    >();

    useEffect(() => {
        StyledInput.current = styled.input`
            & {
                position: absolute;
                top: 0px;
                left: 0px;
                height: 100%;
                width: 100%;
                appearance: none;
                // background-color: rgb(55 65 80);
                background-color: transparent;
                border-radius: 100%;
            }

            &:hover::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 13px;
                width: 13px;
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
    }, []);

    return (
        <div
            className={
                className + " relative w-16 h-[4.5px] rounded-full bg-gray-700 "
            }
        >
            {/* Barra de progreso */}
            <div
                className="absolute block top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                style={{ width: `${value * m + n}%` }}
            ></div>

            {/* Input tipo rango */}
            {StyledInput.current && (
                <StyledInput.current
                    value={value}
                    onChange={onChange}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    className="absolute top-[-6px] left-0 w-full h-full cursor-pointer"
                />
            )}
        </div>
    );
}
