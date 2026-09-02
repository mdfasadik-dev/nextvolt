// Centralized environment variable access.
// IMPORTANT: The service role key must NEVER be exposed to the browser.
// Use SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix) in .env.local.
// If a user mistakenly sets NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, we fallback
// (server-side only) but emit a warning so they can correct it.

const isServer = typeof window === "undefined";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let warned = false;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey && isServer && process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; // fallback
    if (!warned) {
        // eslint-disable-next-line no-console
        console.warn(
            "Security warning: Service role key was provided as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY. Move it to SUPABASE_SERVICE_ROLE_KEY (without NEXT_PUBLIC_) to keep it server-only."
        );
        warned = true;
    }
}

export const SUPABASE_SERVICE_ROLE_KEY = serviceKey;

/**
 * Telegram order notifications. Server-only (no NEXT_PUBLIC_ prefix) — the bot
 * token must never reach the browser. Both are optional: when either is unset,
 * notifications are silently skipped and checkout is unaffected.
 */
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_ANON_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
