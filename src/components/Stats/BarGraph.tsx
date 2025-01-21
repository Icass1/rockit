export default function BarGraph({
    items,
    name,
    type = "percentage",
}: {
    items: {
        name: string;
        href: string;
        value: number;
        id: string;
        index: number;
    }[];
    name: string;
    type?: "percentage" | "value";
}) {
    const totalValue = items.reduce((partialSum, a) => partialSum + a.value, 0);

    const maxValue = Math.max(...items.map((item) => item.value));

    return (
        <div className="md:w-96 h-[450px] bg-neutral-800 rounded-lg p-2 overflow-hidden">
            <label className="text-lg font-semibold">{name}</label>

            <div className="relative w-full">
                {items.map((item) => {
                    let top = item.index < 20 ? item.index * 20 : 21 * 20;

                    return (
                        <div
                            key={item.id}
                            id={item.id}
                            className="justify-between absolute transition-[top] duration-1000 w-full grid grid-cols-[1fr_1fr] gap-2 md:px-4 px-7 "
                            style={{ top: `${top}px` }}
                        >
                            <a
                                href={item.href}
                                className="truncate md:hover:underline"
                            >
                                {item.name}
                            </a>
                            <div className="w-full min-w-0 max-w-full flex flex-row items-center relative ml-auto">
                                <div
                                    className="bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-[width] duration-1000 h-1 block rounded"
                                    style={{
                                        width: `calc(${
                                            (item.value / maxValue) * 100
                                        }%)`,
                                    }}
                                />
                                <label
                                    className="flex font-semibold px-1 text-xs text-left transition-[left] duration-1000"
                                    style={{
                                        left: `min(calc(${
                                            (item.value / maxValue) * 100
                                        }% + 4px))`,
                                    }}
                                >
                                    {(() => {
                                        if (type == "percentage") {
                                            return (
                                                Math.round(
                                                    (item.value / totalValue) *
                                                        100
                                                ) + "%"
                                            );
                                        } else if (type == "value") {
                                            return item.value;
                                        }
                                    })()}
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
