import { libraryLists } from "@/stores/libraryLists";
import { useStore } from "@nanostores/react";
import { Plus, Check } from "lucide-react";

export const addToLibraryHandleClick = ({
    id,
    type,
}: {
    id: string;
    type: string;
}) => {
    const isInLibrary = libraryLists.get().some((list) => list.id === id);

    if (isInLibrary) {
        // Quitar de la biblioteca
        fetch(`/api/remove-list/${type}/${id}`)
            .then((response) => response.json())
            .then(() => {
                const updatedLists = libraryLists
                    .get()
                    .filter((list) => list.id !== id);
                libraryLists.set(updatedLists);
            });
    } else {
        // Agregar a la biblioteca
        fetch(`/api/add-list/${type}/${id}`)
            .then((response) => response.json())
            .then((data) => {
                libraryLists.set([...libraryLists.get(), data]);
            });
    }
};

export default function AddToLibrary({
    type,
    id,
}: {
    type: string;
    id: string;
}) {
    const $libraryLists = useStore(libraryLists);

    const isInLibrary = $libraryLists.some((list) => list.id === id);

    return (
        <div
            className="w-7 h-7 relative md:hover:scale-105 cursor-pointer"
            onClick={() => addToLibraryHandleClick({ id, type })}
        >
            <div className="border-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid rounded-full border-[2px] w-7 h-7"></div>
            {isInLibrary ? (
                <Check
                    strokeWidth={1.3}
                    className="h-5 w-5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            ) : (
                <Plus
                    strokeWidth={1.3}
                    className="h-5 w-5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute transition-transform"
                />
            )}
        </div>
    );
}
