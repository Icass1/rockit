import { pinnedLists } from "@/stores/pinnedLists";
import { useStore } from "@nanostores/react";
import { Plus, Check } from "lucide-react";

export default function AddToLibrary({
    type,
    id,
}: {
    type: string;
    id: string;
}) {
    const $pinnedLists = useStore(pinnedLists);

    const isInLibrary = $pinnedLists.some((list) => list.id === id);

    const handleClick = () => {
        if (isInLibrary) {
            // Quitar de la biblioteca
            fetch(`/api/remove-list/${type}/${id}`, {
                method: "DELETE",
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to remove from library");
                    }
                    return response.json();
                })
                .then(() => {
                    // Actualizar el estado local eliminando la lista
                    pinnedLists.set(
                        $pinnedLists.filter((list) => list.id !== id)
                    );
                })
                .catch((error) => {
                    console.error("Error removing from library:", error);
                });
        } else {
            // Agregar a la biblioteca
            fetch(`/api/add-list/${type}/${id}`)
                .then((response) => response.json())
                .then((data) => {
                    // Actualizar el estado local agregando la lista
                    pinnedLists.set([...$pinnedLists, data]);
                })
                .catch((error) => {
                    console.error("Error adding to library:", error);
                });
        }
    };

    return (
        <div
            className="w-10 h-10 relative hover:scale-105"
            onClick={handleClick}
        >
            <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-9 h-9"></div>
            {isInLibrary ? (
                <Check
                    strokeWidth={1.3}
                    className="h-6 w-6 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            ) : (
                <Plus
                    strokeWidth={1.3}
                    className="h-6 w-6 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            )}
        </div>
    );
}
