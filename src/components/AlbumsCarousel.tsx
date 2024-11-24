import React from "react";

interface Album {
  id: number;
  title: string;
  artist: string;
  image: string;
}

interface AlbumsCarouselProps {
  albums: Album[];
}

const AlbumsCarousel: React.FC<AlbumsCarouselProps> = ({ albums }) => {
  const centerIndex = Math.floor(albums.length / 2);

  return (
    <div className="relative flex items-center">
      {albums.map((album, index) => {
        const scale = 1 - Math.abs(index - centerIndex) * 0.1; // Reduce el tamaño para crear escalera
        const zIndex = 20 - Math.abs(index - centerIndex); // Control de la profundidad

        return (
          <div
            key={album.id}
            className="relative transition-transform duration-300"
            style={{
              transform: `translateX(${(index - centerIndex)*-5}rem) scale(${scale})`,
              zIndex,
            }}
          >
            <div className="relative w-72 rounded-lg overflow-hidden">
              <img
                src={album.image}
                alt={album.title}
                className="w-full h-full object-cover brightness-75" // Más oscuro
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white p-2 rounded">
                <h3 className="text-sm font-bold">{album.title}</h3>
                <p className="text-xs text-gray-300">{album.artist}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlbumsCarousel;