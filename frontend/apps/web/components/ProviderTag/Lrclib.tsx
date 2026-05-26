import type { JSX } from "react";

export default function LrclibProviderTag({}: {
    iconOnly?: boolean;
}): JSX.Element {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
            <rect width="400" height="400" rx="75" fill="#040b4d" />

            <text
                x="200"
                y="175"
                fill="#ffffff"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="bold"
                fontSize="135"
                textAnchor="middle"
                letterSpacing="4"
            >
                LRC
            </text>

            <text
                x="220"
                y="330"
                fill="#ffffff"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="bold"
                fontSize="135"
                textAnchor="middle"
                letterSpacing="35"
            >
                LIB
            </text>
        </svg>
    );
}
