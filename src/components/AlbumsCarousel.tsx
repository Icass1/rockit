import React, { useState } from "react";

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
    { id: 4, title: "Title 4", artist: "Artist 4", image: "/song-placeholder.png" },
    { id: 5, title: "Title 5", artist: "Artist 5", image: "/song-placeholder.png" },
    { id: 6, title: "Title 6", artist: "Artist 6", image: "/song-placeholder.png" },
    { id: 7, title: "Title 7", artist: "Artist 7", image: "/song-placeholder.png" },
  ];

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
      {albums.map((album, index) => {
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
              {/* Mostrar título y artista solo para el álbum central */}
              {index === currentIndex && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white p-2 rounded">
                  <h3 className="text-sm font-bold">{album.title}</h3>
                  <p className="text-xs text-gray-300">{album.artist}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlbumsCarousel;