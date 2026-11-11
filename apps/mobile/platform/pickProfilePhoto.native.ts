import {
    launchImageLibraryAsync,
    requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import type { ProfilePhotoResult } from "@/models/interfaces/profilePhoto";

export async function pickProfilePhoto(): Promise<ProfilePhotoResult> {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
    const result = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
    });
    if (result.canceled) return { status: "cancelled" };
    const asset = result.assets[0];
    const type = asset.mimeType ?? "image/jpeg";
    if (
        (asset.fileSize ?? 0) > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(type)
    )
        return { status: "invalid" };
    const filename = asset.fileName ?? "profile.jpg";
    // React Native FormData consumes a URI descriptor; never read the photo as base64.
    const file = { uri: asset.uri, name: filename, type } as unknown as Blob;
    return { status: "selected", file, filename };
}
