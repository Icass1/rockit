"use server";

export async function Song({ index }: { index: number }) {
    return (
        <div className="m-1 bg-red-300 p-1 hover:bg-gray-800">Song {index}</div>
    );
}

export default async function RenderList() {
    return (
        <div className="flex h-full w-full flex-row bg-red-400">
            <div className="h-full w-1/2 pb-24 pt-24">
                <div className="h-full w-full bg-blue-500">A</div>
            </div>
            <div className="flex h-full w-1/2 flex-col gap-2 overflow-y-auto bg-green-400 pb-96 pt-24">
                {Array(100)
                    .fill(1)
                    .map((_, i) => (
                        <Song key={i} index={i}></Song>
                    ))}
            </div>
        </div>
    );
}
