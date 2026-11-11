export type ProfilePhotoResult =
    | { status: "cancelled" | "denied" | "invalid" }
    | { status: "selected"; file: Blob; filename: string };
