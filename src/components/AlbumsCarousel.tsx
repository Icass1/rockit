import React, { useState } from "react";
import { Play } from "lucide-react";

interface Album {
  id: number;
  title: string;
  artist: string;
  image: string;
}

const AlbumsCarousel: React.FC = () => {
  const albums: Album[] = [
    { id: 1, title: "Title 1", artist: "Artist 1", image: "/song-placeholder.png" },
    { id: 2, title: "Title 2", artist: "Artist 2", image: "/song-placeholder.png" },
    { id: 3, title: "Title 3", artist: "Artist 3", image: "/song-placeholder.png" },
    { id: 4, title: "Test Title", artist: "Test Artist", image: "https://m.media-amazon.com/images/I/61VWSXTDFfL._UF894,1000_QL80_.jpg" },
    { id: 5, title: "Title 5", artist: "Artist 5", image: "/song-placeholder.png" },
    { id: 6, title: "Title 6", artist: "Artist 6", image: "/song-placeholder.png" },
    { id: 7, title: "Title 7", artist: "Artist 7", image: "/song-placeholder.png" },
  ];

  const visibleAlbums = albums.slice(0, 7);
  const [currentIndex, setCurrentIndex] = useState(3); // Empezamos con el álbum central en el medio

  // Lógica para desplazamiento suave
  const scrollAlbums = (direction: "left" | "right") => {
    setCurrentIndex((prevIndex) => {
      if (direction === "left") {
        return prevIndex === 0 ? albums.length - 1 : prevIndex - 1;
      } else {
        return prevIndex === albums.length - 1 ? 0 : prevIndex + 1;
      }
    });
  };

  return (
    <div className="relative flex items-center">
      { visibleAlbums.map((album, index) => {
        const distanceFromCenter = Math.abs(index - currentIndex);
        const scale = 1 - distanceFromCenter * 0.1; // Escalado en función de la distancia al centro
        const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
        const translateX = (index - currentIndex) * -5; // Separación horizontal
        const brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro

        return (
          <div
            key={album.id}
            className="relative transition-all duration-500" // Animación suave de 500ms
            style={{
              transform: `translateX(${translateX}rem) scale(${scale})`,
              zIndex,
              transition: 'transform 500ms ease-in-out, filter 500ms ease-in-out', // Añadimos suavizado en la transición
            }}
          >
            <div className="relative w-72 rounded-lg overflow-hidden">
              {/* Imagen con brillo dinámico */}
              <img
                src={album.image}
                alt={album.title}
                className="w-full h-full object-cover"
                style={{ filter: `brightness(${brightness})` }} // Aplicamos el brillo dinámico
            />
            {/* Degradado sobre la imagen */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              {/* Mostrar título y artista solo para el álbum central */}
              {index === currentIndex && (
                <>
                <div className="absolute bottom-2 left-2 text-white p-2 rounded">
                  <h3 className="text-2xl font-bold">{album.title}</h3>
                  <p className="text-md font-semibold text-gray-100">{album.artist}</p>
                </div>
                <button
                    className="z-50 absolute bottom-4 backdrop-blur-sm right-4 bg-transparent text-white p-3 rounded-full hover:bg-black/40 transition duration-300"
                    onClick={() => alert("Play button clicked")}
                >
                    <Play className="h-5 w-5" />
                </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlbumsCarousel;