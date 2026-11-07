import { useLocalSearchParams } from "expo-router";
import ArtistScreen from "@/components/Artist/ArtistScreen";

export default function ArtistPage() {
    const { name } = useLocalSearchParams<{ name: string }>();
    return <ArtistScreen identity={name} byName />;
}
