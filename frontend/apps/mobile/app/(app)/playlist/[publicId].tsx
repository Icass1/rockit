import { useLocalSearchParams } from "expo-router";
import CollectionScreen from "@/components/RenderList/CollectionScreen";

export default function CollectionPage() {
    const { publicId } = useLocalSearchParams<{ publicId: string }>();
    return <CollectionScreen key={publicId} publicId={publicId} />;
}
