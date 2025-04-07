import { useEffect, useRef, useState } from "react";
import { currentSong } from "@/stores/audio";
import { useStore } from "@nanostores/react";
import { PictureInPicture2 } from "lucide-react";
import Image from "@/components/Image";

export default function PictureInPictureImage() {
    const imageRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const $currentSong = useStore(currentSong);

    const [canvas, setCanvas] = useState<HTMLCanvasElement>();

    useEffect(() => {
        const image = imageRef.current;
        if (!canvas || !$currentSong || !image) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const handleLoad = () => {
            const imageElement = imageRef.current;
            if (!imageElement) return;
            ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        };

        image.addEventListener("load", handleLoad);

        return () => {
            image.removeEventListener("load", handleLoad);
        };
    }, [canvas, imageRef, $currentSong]);

    const handlePictureInPicture = async () => {
        try {
            // Obtén la imagen
            const imageElement = imageRef.current;
            const videoElement = videoRef.current;

            if (!imageElement || !videoElement) {
                console.error("No se pudo acceder a los elementos.");
                return;
            }

            // Crear un canvas para renderizar la imagen
            const canvas = document.createElement("canvas");
            canvas.id = "canvas-picture-in-picture";
            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;
            const ctx = canvas.getContext("2d");
            setCanvas(canvas);

            if (!ctx) {
                console.error("No se pudo obtener el contexto del canvas.");
                return;
            }

            // Dibujar la imagen en el canvas
            ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

            // Convertir el canvas a un video
            const stream = canvas.captureStream();
            videoElement.srcObject = stream;
            await videoElement.play();

            // Iniciar el modo PiP
            if (videoElement.requestPictureInPicture) {
                const a = await videoElement.requestPictureInPicture();
                console.log(a);
            } else {
                console.error("Picture-in-Picture no es compatible.");
            }
        } catch (error) {
            console.error(
                "Error al iniciar el modo Picture-in-Picture:",
                error
            );
        }
    };

    return (
        <div>
            {/* Imagen visible */}
            <Image
                width={100}
                height={100}
                ref={imageRef}
                src={
                    $currentSong?.image
                        ? `/api/image/${$currentSong?.image}`
                        : "/song-placeholder.png"
                }
                crossOrigin="anonymous"
                alt="Demo"
                className="hidden mx-auto mb-4 w-full max-w-md rounded-lg shadow-md"
            />

            {/* Video oculto */}
            <video
                ref={videoRef}
                style={{ display: "none" }}
                muted // El video debe estar silenciado para evitar errores de reproducción.
            ></video>

            {/* Botón con Icono de Lucide */}
            <button
                onClick={handlePictureInPicture}
                className="flex items-center justify-center text-gray-400 md:hover:text-white rounded-full transition"
                aria-label="Activar Picture-in-Picture"
            >
                <PictureInPicture2 className="w-6 h-6" />
            </button>
        </div>
    );
}
