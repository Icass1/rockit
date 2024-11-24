import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Album {
    id: number;
    title: string;
    artist: string;
    image: string;
}

function Version1({ visibleAlbums }: { visibleAlbums: Album[] }) {
    return (
        <div className="relative flex items-center">
            {visibleAlbums.map((album, index) => {
                const distanceFromCenter = Math.abs(index - 3);
                const scale = 1 - distanceFromCenter * 0.1; // Escalado en función de la distancia al centro
                const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
                const translateX = (index - 3) * -5; // Separación horizontal
                const brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro

                return (
                    <div
                        key={album.id}
                        className="relative transition-all duration-500" // Animación suave de 500ms
                        style={{
                            transform: `translateX(${translateX}rem) scale(${scale})`,
                            zIndex,
                            transition:
                                "transform 500ms ease-in-out, filter 500ms ease-in-out", // Añadimos suavizado en la transición
                        }}
                    >
                        <div className="relative w-72 rounded-lg overflow-hidden">
                            {/* Imagen con brillo dinámico */}
                            <img
                                src={album.image}
                                alt={album.title}
                                className="w-full h-full object-cover"
                                style={{
                                    filter: `brightness(${brightness})`,
                                }} // Aplicamos el brillo dinámico
                            />
                            {/* Degradado sobre la imagen */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                            {/* Mostrar título y artista solo para el álbum central */}
                            {index === 3 ||
                                (true && (
                                    <>
                                        <div className="absolute bottom-2 left-2 text-white p-2 rounded">
                                            <h3 className="text-2xl font-bold">
                                                {album.title}
                                            </h3>
                                            <p className="text-md font-semibold text-gray-100">
                                                {album.artist}
                                            </p>
                                        </div>
                                        <button
                                            className="z-50 absolute bottom-4 backdrop-blur-sm right-4 bg-transparent text-white p-3 rounded-full hover:bg-black/40 transition duration-300"
                                            onClick={() =>
                                                alert("Play button clicked")
                                            }
                                        >
                                            <Play className="h-5 w-5" />
                                        </button>
                                    </>
                                ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Version2({
    albums,
    currentIndex,
}: {
    albums: Album[];
    currentIndex: number;
}) {
    return (
        <div className="relative w-full h-full max-h-[300px]">
            {albums.map((album, index) => {
                let distanceFromCenter = Math.abs(index - currentIndex);
                let neg = index > currentIndex ? -1 : 1;

                let scale = `${1 - distanceFromCenter * 0.1}`; // Escalado en función de la distancia al centro
                const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
                let left = `${50 + distanceFromCenter * neg * -9}%`; // Separación horizontal
                let brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro

                if (distanceFromCenter > 4) {
                    scale = "0";
                    distanceFromCenter = 3;
                    left = `${50 + distanceFromCenter * neg * -9}%`; // Separación horizontal
                    brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro
                }

                return (
                    <div
                        key={album.id}
                        className="h-full w-auto aspect-square absolute -translate-x-1/2  transition-all origin-center duration-300"
                        style={{ left: left, zIndex: zIndex }}
                    >
                        <div
                            className="h-full w-auto transition-all duration-300 rounded-lg overflow-hidden"
                            style={{
                                scale: scale,
                            }}
                        >
                            <img
                                src={album.image}
                                className="transition-all duration-300"
                                style={{ filter: `brightness(${brightness})` }}
                            />
                            <label className="absolute bottom-9 left-2 text-2xl font-bold">
                                {album.title}
                            </label>
                            <label className="absolute bottom-2 left-2 text-xl font-semibold">
                                {album.artist}
                            </label>
                            <button
                                className="absolute bottom-4 backdrop-blur-sm right-4 bg-transparent text-white p-3 rounded-full hover:bg-black/40 transition duration-300"
                                onClick={() => alert("Play button clicked")}
                            >
                                <Play className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
export default function AlbumsCarousel() {
    const albums = Array(20)
        .fill(1)
        .map((_, index) => {
            return {
                id: index,
                title: `Title ${index}`,
                artist: `Artist ${index}`,
                image: "https://m.media-amazon.com/images/I/61VWSXTDFfL._UF894,1000_QL80_.jpg",
            };
        });
    const [currentIndex, setCurrentIndex] = useState(0); // Empezamos con el álbum central en el medio
    return (
        <div className="text-white h-1/2 flex items-center justify-center overflow-x-hidden relative select-none">
            <ChevronLeft
                className="z-30 absolute left-40 h-48 w-10 text-[#6d6d6d] hover:text-white p-2 rounded-full transition duration-300"
                onClick={() =>
                    setCurrentIndex((value) => (value > 0 ? value - 1 : 0))
                }
            />
            <Version2 albums={albums} currentIndex={currentIndex} />

            <ChevronRight
                className="z-30 absolute right-40 h-48 w-10 text-[#6d6d6d] hover:text-white p-2 rounded-full transition duration-300"
                onClick={() =>
                    setCurrentIndex((value) =>
                        value < albums.length - 1
                            ? value + 1
                            : albums.length - 1
                    )
                }
            />
        </div>
    );
}
