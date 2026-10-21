export const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";

/**
 * Public origin the web app is served from. Used to build the absolute URLs
 * that link-preview crawlers (WhatsApp, Telegram, Slack, Twitter...) require.
 */
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://rockit.rockhosting.org";
