import React from "react";

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

  const centerIndex = Math.floor(albums.length / 2); // Índice del álbum central

  return (
    <div className="relative flex items-center">
      {albums.map((album, index) => {
        const distanceFromCenter = Math.abs(index - centerIndex);
        const scale = 1 - distanceFromCenter * 0.1; // Escalado en función de la distancia al centro
        const zIndex = 20 - distanceFromCenter; // Profundidad dinámica
        const translateX = (index - centerIndex) * -5; // Separación horizontal
        const brightness = 1 - distanceFromCenter * 0.2; // Brillo en función de la distancia al centro

        return (
          <div
            key={album.id}
            className="relative transition-transform duration-300"
            style={{
              transform: `translateX(${translateX}rem) scale(${scale})`,
              zIndex,
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
              {index === centerIndex && (
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