import { loadEnv } from "vite";

export const ENV: {
    ENVIRONMENT: string;
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    BACKEND_URL: string;
    FRONTEND_URL: string;
    SONGS_PATH: string;
    TEMP_PATH: string;
    LOGS_PATH: string;
    IMAGES_PATH: string;
    INSECURE_DB_MODE: "true" | "false";
} = loadEnv(".env", process.cwd(), "") as any;
