import React, { useEffect, useState } from "react";
import "./DownloadAnimation.css";

const DownloadAnimation = ({ progress = 0, duration = 2 }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Start the animation when component mounts
        setIsAnimating(true);
    }, []);

    // Calculate circle progress (0 to 100 maps to 0 to 360 degrees)
    const circleProgress = Math.min(Math.max(progress, 0), 100);
    const circumference = 2 * Math.PI * 45; // 2*π*r where r=45
    const strokeDashoffset =
        circumference - (circleProgress / 100) * circumference;

    return (
        <div className="download-container">
            <svg
                width="120"
                height="120"
                viewBox="0 0 100 100"
                className="download-svg"
            >
                {/* Background Circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="8"
                />

                {/* Progress Circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 50 50)"
                    className="progress-circle"
                />

                {/* Download Icon */}
                <g className={`download-icon ${isAnimating ? "animate" : ""}`}>
                    {/* Arrow Stem */}
                    <path
                        d="M 50,30 L 50,60"
                        stroke="#333"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                        className="arrow-stem"
                    />

                    {/* Arrow Head */}
                    <path
                        d="M 50,60 L 40,50 M 50,60 L 60,50"
                        stroke="#333"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                        className="arrow-head"
                    />

                    {/* Horizontal line */}
                    <path
                        d="M 35,70 L 65,70"
                        stroke="#333"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                        className="horizontal-line"
                    />
                </g>

                {/* Progress Text */}
                <text
                    x="50"
                    y="85"
                    textAnchor="middle"
                    className="progress-text"
                    fill="#007bff"
                    fontSize="12"
                    fontWeight="bold"
                >
                    {circleProgress}%
                </text>
            </svg>
        </div>
    );
};

export default DownloadAnimation;
