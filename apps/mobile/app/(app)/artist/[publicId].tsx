import { useLocalSearchParams } from "expo-router";
import ArtistScreen from "@/components/Artist/ArtistScreen";

export default function ArtistPage() {
    const { publicId } = useLocalSearchParams<{ publicId: string }>();
    return <ArtistScreen identity={publicId} />;
}
