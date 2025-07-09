export default function Spinner({
    color = "rgb(156 163 175)",
    width = "32px",
    height = "32px",
    className = "",
}: {
    color?: string;
    width?: string;
    height?: string;
    className?: string;
}) {
    return (
        <div style={{ width: width, height: height }} className={className}>
            <svg
                className="animate-spin-custom"
                width={width}
                height={height}
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle
                    className="path"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                ></circle>
            </svg>
            <style>{`
                @keyframes spin {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                @keyframes dash {
                    0% {
                        stroke-dasharray: 1, 150;
                        stroke-dashoffset: 0;
                    }
                    50% {
                        stroke-dasharray: 90, 150;
                        stroke-dashoffset: -35;
                    }
                    100% {
                        stroke-dasharray: 1, 150;
                        stroke-dashoffset: -125;
                    }
                }
                .animate-spin-custom {
                    animation: spin 2s linear infinite;
                }
                .path {
                    animation: dash 1.5s ease-in-out infinite;
                    stroke: ${color}; /* Tailwind blue-500 */
                }
            `}</style>
        </div>
    );
}
