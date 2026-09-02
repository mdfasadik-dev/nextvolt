#!/usr/bin/env node
/**
 * Telegram notification setup helper.
 *
 *   node --env-file=.env.local scripts/telegram-setup.mjs         # find chat id
 *   node --env-file=.env.local scripts/telegram-setup.mjs --test  # send a test order
 *
 * A bot can never message you first, so you must message it once before a
 * chat id exists. This script explains exactly where you are in that process.
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const wantsTest = process.argv.includes("--test");

if (!token) {
    console.error("✗ TELEGRAM_BOT_TOKEN is not set in .env.local");
    process.exit(1);
}

const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json());
if (!me.ok) {
    console.error("✗ Telegram rejected your token:", me.description);
    console.error("  Get a new one from @BotFather and update .env.local");
    process.exit(1);
}
console.log(`✓ Bot is valid: @${me.result.username}`);

if (wantsTest) {
    if (!chatId) {
        console.error("\n✗ TELEGRAM_CHAT_ID is empty — run without --test first to find it.");
        process.exit(1);
    }
    const text = [
        "<b>🛒 New order</b>",
        "<code>#TEST-ORDER</code>",
        "Test Customer · 01700000000",
        "",
        "• Energo 12V 100Ah Battery × 2 — BDT 51000.00",
        "• Beiyi 2P 63A MTS × 1 — BDT 3500.00",
        "",
        "Subtotal: BDT 54500.00",
        "<b>Total: BDT 54620.00</b>",
        "",
        "<i>(test message from your Nextvolt store)</i>",
    ].join("\n");

    const ids = chatId.split(",").map(s => s.trim()).filter(Boolean);
    let failed = 0;
    for (const id of ids) {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: id, text, parse_mode: "HTML" }),
        }).then(r => r.json());

        if (res.ok) {
            console.log(`✓ Test message sent to ${id}`);
        } else {
            failed++;
            console.error(`✗ Failed for ${id}: ${res.description}`);
            if (String(res.description).includes("chat not found")) {
                console.error("  That id is wrong, or that person hasn't pressed Start on the bot yet.");
            }
        }
    }
    process.exit(failed === ids.length ? 1 : 0);
}

const updates = await fetch(`https://api.telegram.org/bot${token}/getUpdates`).then(r => r.json());
const chats = new Map();
for (const u of updates.result || []) {
    const chat = (u.message || u.channel_post || u.my_chat_member)?.chat;
    if (chat?.id != null) {
        const label = chat.title
            || [chat.first_name, chat.last_name].filter(Boolean).join(" ")
            || chat.username
            || chat.type;
        chats.set(chat.id, `${label} — ${chat.type}`);
    }
}

if (!chats.size) {
    console.log("\n✗ No chats found yet. Do this first:\n");
    console.log(`  1. Open  https://t.me/${me.result.username}`);
    console.log("  2. Press START (or send any message like 'hi')");
    console.log("  3. Run this script again\n");
    console.log("  For a team group instead: create a group, add the bot,");
    console.log("  send a message in it, then re-run.");
    process.exit(0);
}

console.log("\n✓ Found these chats:\n");
for (const [id, label] of chats) {
    console.log(`   TELEGRAM_CHAT_ID=${id}`);
    console.log(`   ${label}\n`);
}
console.log("Put the id in .env.local as TELEGRAM_CHAT_ID, then run:");
console.log("  node --env-file=.env.local scripts/telegram-setup.mjs --test\n");
console.log("To notify several people, comma-separate the ids:");
console.log("  TELEGRAM_CHAT_ID=1721186540,987654321");
