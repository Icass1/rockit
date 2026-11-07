import type { JSX } from "react";

export default function LrclibProviderTag({}: {
    iconOnly?: boolean;
}): JSX.Element {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
            <rect
                width="400"
                height="400"
                rx="75"
                className="fill-provider-lyrics"
            />

            <text
                x="200"
                y="175"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="bold"
                fontSize="135"
                textAnchor="middle"
                letterSpacing="4"
                className="fill-on-media"
            >
                LRC
            </text>

            <text
                x="220"
                y="330"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="bold"
                fontSize="135"
                textAnchor="middle"
                letterSpacing="35"
                className="fill-on-media"
            >
                LIB
            </text>
        </svg>
    );
}
