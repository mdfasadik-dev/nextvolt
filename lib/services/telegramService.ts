import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "@/lib/env";

export type TelegramOrderItem = {
    name: string | null;
    variant?: string | null;
    quantity: number;
    lineTotal: number;
};

export type TelegramOrderPayload = {
    orderId: string;
    currency: string;
    items: TelegramOrderItem[];
    subtotal: number;
    total: number;
    customerName?: string | null;
    customerPhone?: string | null;
};

/** Escape the characters Telegram's HTML parse mode treats as markup. */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function money(amount: number, currency: string): string {
    const safe = Number.isFinite(amount) ? amount : 0;
    return `${currency} ${safe.toFixed(2)}`;
}

export function buildOrderMessage(payload: TelegramOrderPayload): string {
    const lines: string[] = [];
    lines.push("<b>🛒 New order</b>");
    lines.push(`<code>#${escapeHtml(payload.orderId)}</code>`);

    const who = [payload.customerName, payload.customerPhone].filter(Boolean).join(" · ");
    if (who) lines.push(escapeHtml(who));

    lines.push("");
    for (const item of payload.items) {
        const name = escapeHtml(item.name?.trim() || "Item");
        const variant = item.variant?.trim() ? ` (${escapeHtml(item.variant.trim())})` : "";
        lines.push(`• ${name}${variant} × ${item.quantity} — ${money(item.lineTotal, payload.currency)}`);
    }

    lines.push("");
    if (payload.subtotal !== payload.total) {
        lines.push(`Subtotal: ${money(payload.subtotal, payload.currency)}`);
    }
    lines.push(`<b>Total: ${money(payload.total, payload.currency)}</b>`);

    return lines.join("\n");
}

/**
 * TELEGRAM_CHAT_ID accepts one id or several separated by commas, so orders can
 * go to you and your client (or a team group) at once.
 */
function recipientIds(): string[] {
    return (TELEGRAM_CHAT_ID || "")
        .split(",")
        .map(id => id.trim())
        .filter(Boolean);
}

export class TelegramService {
    static get isConfigured(): boolean {
        return Boolean(TELEGRAM_BOT_TOKEN && recipientIds().length);
    }

    /**
     * Send an order summary to the configured chat.
     *
     * Never throws: a notification failure must not fail a checkout that has
     * already been persisted. Returns whether the message was delivered.
     */
    static async notifyNewOrder(payload: TelegramOrderPayload): Promise<boolean> {
        if (!this.isConfigured) return false;
        const text = buildOrderMessage(payload);
        // One recipient failing must not stop the others, so send in parallel
        // and report success if at least one message got through.
        const results = await Promise.all(recipientIds().map(id => this.send(id, text)));
        return results.some(Boolean);
    }

    private static async send(chatId: string, text: string): Promise<boolean> {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text,
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                    }),
                    // Don't let a slow Telegram call hold the checkout response.
                    signal: AbortSignal.timeout(8000),
                },
            );
            if (!response.ok) {
                const body = await response.text().catch(() => "");
                console.error(`[telegram] sendMessage failed for ${chatId}`, response.status, body.slice(0, 300));
                return false;
            }
            return true;
        } catch (error) {
            console.error(`[telegram] notification error for ${chatId}`, error);
            return false;
        }
    }
}
