export const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    "BACKEND_URL_1";

console.log(
    "process.env.NEXT_PUBLIC_BACKEND_URL",
    process.env.NEXT_PUBLIC_BACKEND_URL
);
console.log(
    "process.env.EXPO_PUBLIC_BACKEND_URL",
    process.env.EXPO_PUBLIC_BACKEND_URL
);
console.log("BACKEND_URL", BACKEND_URL);
