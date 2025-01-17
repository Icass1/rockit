import { useState } from 'react';
import { Import, RadioTower } from 'lucide-react';
import Downloads from './MusicDownloader';


export default function ButtonSection() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <section className="flex md:hidden pt-10 pb-5 px-4 text-white">
                <div className="flex justify-center gap-4">
                    {/* Botón de Import */}
                    <button
                        className="flex flex-col items-center justify-center gap-2 w-1/2 px-3 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                        onClick={() => setOpen(!open)}
                    >
                        <Import className="w-8 h-8" />
                        <span className="text-sm font-semibold text-center">Import songs from YT Music/Spotify</span>
                    </button>

                    {/* Botón de Radio */}
                    <a
                        href="/radio"
                        className="flex flex-col items-center justify-center gap-2 w-1/2 px-3 py-2 bg-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        <RadioTower className="w-8 h-8" />
                        <span className="text-sm font-semibold text-center flex items-center">Search for radio stations</span>
                    </a>
                </div>
            </section>
        </>
    );
}