import React, { useEffect, useState } from "react";

const DownloadAnimation = ({ progress = 0, duration = 2 }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setIsAnimating(true);
    }, []);

    const circleProgress = Math.min(Math.max(progress, 0), 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset =
        circumference - (circleProgress / 100) * circumference;

    const styles = `
        @keyframes drawCircle {
            to { stroke-dashoffset: 0; }
        }
        @keyframes drawStem {
            to { stroke-dashoffset: 0; }
        }
        @keyframes drawHead {
            to { stroke-dashoffset: 0; }
        }
        @keyframes drawLine {
            to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
            to { opacity: 1; }
        }
        .animate-drawCircle {
            animation: drawCircle 1s ease forwards;
        }
        .animate-drawStem {
            animation: drawStem 0.6s ease 0.8s forwards;
        }
        .animate-drawHead {
            animation: drawHead 0.4s ease 1.4s forwards;
        }
        .animate-drawLine {
            animation: drawLine 0.4s ease 1.2s forwards;
        }
        .animate-fadeIn {
            animation: fadeIn 0.5s ease 1s forwards;
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="relative h-full w-full">
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    className="block"
                >
                    {/* Background Circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e0e0e0"
                        strokeWidth="4"
                        style={{
                            strokeDasharray: 283,
                            strokeDashoffset: 283,
                        }}
                        className="animate-drawCircle"
                    />

                    {/* Progress Circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#007bff"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-300 ease-linear"
                    />

                    {/* Download Icon */}
                    <g
                        className={`transition-all delay-500 duration-500 ease-in-out ${
                            isAnimating
                                ? "scale-100 opacity-100"
                                : "scale-80 opacity-0"
                        }`}
                    >
                        <path
                            d="M 50,30 L 50,60"
                            stroke="#333"
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                            style={{
                                strokeDasharray: 30,
                                strokeDashoffset: 30,
                            }}
                            className={isAnimating ? "animate-drawStem" : ""}
                        />

                        <path
                            d="M 50,60 L 40,50 M 50,60 L 60,50"
                            stroke="#333"
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                            style={{
                                strokeDasharray: 28,
                                strokeDashoffset: 28,
                            }}
                            className={isAnimating ? "animate-drawHead" : ""}
                        />

                        <path
                            d="M 35,70 L 65,70"
                            stroke="#333"
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                            style={{
                                strokeDasharray: 30,
                                strokeDashoffset: 30,
                            }}
                            className={isAnimating ? "animate-drawLine" : ""}
                        />
                    </g>

                    <text
                        x="50"
                        y="85"
                        textAnchor="middle"
                        fill="#007bff"
                        fontSize="12"
                        fontWeight="bold"
                        className={`opacity-0 ${isAnimating ? "animate-fadeIn" : ""}`}
                    >
                        {circleProgress}%
                    </text>
                </svg>
            </div>
        </>
    );
};

export default DownloadAnimation;
