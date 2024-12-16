import { loadEnv } from "vite";

const REQUIRED_ENV_VARS = [
    "ENVIRONMENT",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "BACKEND_URL",
    "FRONTEND_URL",
    "SONGS_PATH",
    "TEMP_PATH",
    "LOGS_PATH",
    "IMAGES_PATH",
    "INSECURE_DB_MODE",
    "API_KEY",
] as const;

type EnvKeys = (typeof REQUIRED_ENV_VARS)[number];

export const ENV: Record<EnvKeys, string | "true" | "false"> = loadEnv(
    "",
    process.cwd(),
    ""
) as any;

// Check for missing environment variables
const missingVars = REQUIRED_ENV_VARS.filter((key) => !ENV[key]);

if (missingVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}. Please ensure all required variables are set in your .env file.`
    );
}
