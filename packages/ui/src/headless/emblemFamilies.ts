/** Original filled family marks. One 32-unit master serves SVG and physical relief. */
export const emblemFamilyMarks = {
    ignition:
        "M2 11H6V21H2ZM8 7H12V25H8ZM14 3H18V29H14ZM20 7H24V25H20ZM26 11H30V21H26Z",
    orbit: "M16 3a13 13 0 1 1 0 26a13 13 0 1 1 0-26ZM16 7a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM14 9h4v6h5v4h-9Z",
    groove: "M16 3a13 13 0 1 1 0 26a13 13 0 1 1 0-26ZM16 13.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5ZM9 9A10 10 0 0 1 23 9L21 11A7 7 0 0 0 11 11ZM23 23A10 10 0 0 1 9 23L11 21A7 7 0 0 0 21 21Z",
    atlas: "M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12ZM16 11L11 16L16 21L21 16Z",
    flame: "M18 2C19 9 27 12 27 20C27 26 22 30 16 30C9 30 5 25 5 19C5 13 10 8 13 6C12 13 14 15 15 14C17 12 18 8 18 2ZM16 17C14 20 11 22 13 25C15 28 21 26 20 23C20 21 17 20 16 17Z",
    voyager: "M3 13L29 3L14 18ZM16 20L29 3L20 29Z",
    companions:
        "M8 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM24 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM2 28V22a6 6 0 0 1 12 0v6ZM18 28V22a6 6 0 0 1 12 0v6Z",
    camera: "M6 5H26Q29 5 29 8V24Q29 27 26 27H6Q3 27 3 24V8Q3 5 6 5ZM13 10V22L23 16Z",
    fusion: "M8 7C3 7 1 11 1 16C1 21 4 25 8 25C12 25 14 22 16 19C18 22 20 25 24 25C29 25 31 21 31 16C31 11 28 7 24 7C20 7 18 10 16 13C14 10 12 7 8 7ZM8 12C10 12 12 14 13 16C11 19 10 20 8 20C6 20 5 18 5 16C5 14 6 12 8 12ZM24 12C26 12 27 14 27 16C27 18 26 20 24 20C22 20 20 18 19 16C21 13 22 12 24 12Z",
    calendar:
        "M8 3H12V7H20V3H24V7H26Q29 7 29 10V26Q29 29 26 29H6Q3 29 3 26V10Q3 7 6 7H8ZM7 13V25H25V13ZM9 18L12 15L15 18L21 14L23 17L15 23Z",
    moon: "M14.34 3.10A13 13 0 1 0 28.38 19.96A11 11 0 0 1 14.34 3.10Z",
    sunrise:
        "M5 23A11 11 0 0 1 27 23ZM3 26H29V30H3ZM14 2H18V9H14ZM3 9L6 6L11 11L8 14ZM21 11L26 6L29 9L24 14Z",
    weekend:
        "M5 5H27V12C21 12 21 20 27 20V27H5V20C11 20 11 12 5 12ZM12 10V22H15V10ZM18 10V22H21V10Z",
    hourglass: "M3 5Q10 4 14 8V28Q10 24 3 25ZM29 5Q22 4 18 8V28Q22 24 29 25Z",
    anniversary:
        "M3 8L10 14L16 4L22 14L29 8L26 25H6ZM16 13L12 19L16 23L20 19ZM7 28H25V31H7Z",
    artifact:
        "M10 3H22L29 10V22L22 29H10L3 22V10ZM16 8C12 8 10 11 10 14C10 16 12 18 13 18L12 24H20L19 18C21 18 22 16 22 14C22 11 20 8 16 8Z",
} as const;

const scopes = {
    session: "ignition",
    total: "orbit",
    plays: "groove",
    discovery: "atlas",
    streak: "flame",
    sharing: "voyager",
    friends: "companions",
    videos: "camera",
    mixed: "fusion",
    active_days: "calendar",
    night: "moon",
    early: "sunrise",
    weekend: "weekend",
    tenure: "hourglass",
    anniversary: "anniversary",
    secrets: "artifact",
} as const;

/** Scope fixes historical variants without changing earned award IDs or API data. */
export function emblemFamilyVariant(variant: string, scope?: string) {
    if (scope && Object.hasOwn(scopes, scope))
        return scopes[scope as keyof typeof scopes];
    if (variant === "longplay") return "flame";
    return Object.hasOwn(emblemFamilyMarks, variant)
        ? (variant as keyof typeof emblemFamilyMarks)
        : "ignition";
}

/** Same placement in static artwork and 3D; 26 units across an 80-unit medal. */
export const emblemFamilyPlacement = { centerX: 40, centerY: 39, scale: 0.82 };
