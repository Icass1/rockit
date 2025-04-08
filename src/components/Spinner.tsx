export default function Spinner() {
    return (
        <div className="flex h-8 w-8 items-center justify-center">
            <svg
                className="animate-spin-custom h-12 w-12"
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
                    stroke: rgb(156 163 175); /* Tailwind blue-500 */
                }
            `}</style>
        </div>
    );
}
