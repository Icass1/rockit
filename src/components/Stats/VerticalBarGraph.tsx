"use client";

import { UserStats } from "@/app/api/stats/user/route";
import { getDateDDMMYYYY } from "@/lib/getTime";
import { Dispatch, SetStateAction, useRef, useState } from "react";

function Bar({
    entry,
    index,
    maxValue,
    dataLength,
    setOverlayPos,
    setOverlayData,
    setOverlayTitle,
}: {
    entry: UserStats["minutesListenedByRange"][number];
    index: number;
    maxValue: number;
    dataLength: number;
    setOverlayPos: Dispatch<SetStateAction<[number, number]>>;
    setOverlayData: Dispatch<SetStateAction<string>>;
    setOverlayTitle: Dispatch<SetStateAction<string>>;
}) {
    const divRef = useRef<HTMLDivElement>(null);

    const eventListenerAddedRef = useRef(false);

    const handleMouseMove = () => {
        setOverlayData(entry.minutes.toString() + " Minutes");
        setOverlayTitle(
            `${getDateDDMMYYYY(entry.start)} - ${getDateDDMMYYYY(entry.end)}`
        );
        const handleMouseMove = (event: MouseEvent) => {
            if (!divRef.current) return;

            const divRefRect = divRef.current.getBoundingClientRect();

            if (
                divRefRect.x > event.clientX ||
                divRefRect.x + divRefRect.width < event.clientX ||
                divRefRect.y > event.clientY ||
                divRefRect.y + divRefRect.height < event.clientY
            ) {
                setOverlayPos([0, 0]);
                eventListenerAddedRef.current = false;
                document.removeEventListener("mousemove", handleMouseMove);
                return;
            }

            if (!divRef.current.parentElement?.parentElement) return;
            const rect =
                divRef.current.parentElement.parentElement.getBoundingClientRect();

            setOverlayPos([event.clientX - rect.x, event.clientY - rect.y]);
        };

        if (eventListenerAddedRef.current) return;
        eventListenerAddedRef.current = true;
        document.addEventListener("mousemove", handleMouseMove);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            className="absolute block -translate-x-1/2 bg-gradient-to-t from-[#ee1086] to-[#fb6467] transition-all duration-300 ease-in-out md:hover:brightness-150"
            style={{
                left: `calc((100% ) / ${dataLength} * ${index}  + (100%) / ${dataLength} / 2)`,
                height: `calc((100%) * ${entry.minutes / maxValue})`,
                bottom: 0,
                width: `calc((100%) / ${dataLength} - 10px)`,
            }}
        >
            <label className="absolute right-1/2 -bottom-5 origin-right -rotate-45 text-xs text-nowrap text-white">
                {getDateDDMMYYYY(entry.start)} - {getDateDDMMYYYY(entry.end)}
            </label>
        </div>
    );
}

export default function VerticalBarGraph({
    data,
    title,
}: {
    title: string;
    data: UserStats["minutesListenedByRange"];
}) {
    const [overlayPos, setOverlayPos] = useState<[number, number]>([0, 0]);
    const [overlayTitle, setOverlayTitle] = useState("");
    const [overlayData, setOverlayData] = useState("");

    let maxValue = Math.max(...data.map((entry) => entry.minutes));

    const marginLeft = "80px";
    const marginRight = "5px";
    const marginBottom = "120px";
    const marginTop = "40px";

    const maxScaleGroups = 10;

    let scale;
    let groups;

    for (groups = maxScaleGroups; groups > 0; groups--) {
        scale = Math.round(maxValue / groups / 5) * 5;
        if (maxValue / scale <= maxScaleGroups) {
            break;
        }
    }

    if (!scale) return <div>This should never happen</div>;

    maxValue = scale * groups;

    return (
        <div className="relative h-[500px] overflow-hidden rounded-lg bg-neutral-800 p-2">
            <div
                className="absolute"
                style={{
                    top: marginTop,
                    left: marginLeft,
                    bottom: marginBottom,
                    right: marginRight,
                }}
            >
                {Array.from({ length: groups + 1 }).map((_, index) => {
                    return (
                        <div
                            key={index}
                            className="absolute h-[1px] bg-neutral-600"
                            style={{
                                left: "0px",
                                right: "0px",
                                top: `${(index * 100) / groups}%`,
                            }}
                        >
                            <label className="absolute right-[calc(100%_+_7px)] -translate-y-1/2 text-xs">
                                {scale * (groups - index)}
                            </label>
                        </div>
                    );
                })}

                {data.map((entry, index) => {
                    return (
                        <Bar
                            key={index}
                            maxValue={maxValue}
                            entry={entry}
                            index={index}
                            dataLength={data.length}
                            setOverlayPos={setOverlayPos}
                            setOverlayTitle={setOverlayTitle}
                            setOverlayData={setOverlayData}
                        />
                    );
                })}
            </div>

            <div
                className="absolute top-0 right-0 left-0 text-center text-xl font-semibold"
                style={{ height: marginTop }}
            >
                {title}
            </div>

            <div
                className="absolute left-0 border-r-2 border-neutral-400"
                style={{
                    width: marginLeft,
                    bottom: marginBottom,
                    top: marginTop,
                }}
            >
                <label className="absolute top-1/2 left-6 -translate-1/2 -rotate-90 text-xl font-semibold text-nowrap">
                    Minutes listened
                </label>
            </div>

            <div
                className="absolute top-0 right-0 h-full"
                style={{ width: marginRight }}
            />

            {(overlayPos[0] !== 0 || overlayPos[1] !== 0) &&
                (overlayData || overlayTitle) && (
                    <div
                        className="absolute flex w-fit -translate-x-1/2 -translate-y-full flex-col items-center rounded bg-neutral-700 p-2 shadow-2xl shadow-black"
                        style={{ left: overlayPos[0], top: overlayPos[1] }}
                    >
                        <label className="text-nowrap">{overlayTitle}</label>
                        <label className="text-nowrap">{overlayData}</label>
                    </div>
                )}
        </div>
    );
}
