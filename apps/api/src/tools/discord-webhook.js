import multer from "multer";
import { discordFetch } from "./discord-transport.js";

const WEBHOOK_PATH = /^\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{60,200}$/;
const COMPONENTS_V2_FLAG = 1 << 15;
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 10, fileSize: 25 * 1024 * 1024 } });

function safeWebhookUrl(value) {
    try {
        const url = new URL(String(value));
        const allowedHost = url.hostname === "discord.com" || url.hostname === "discordapp.com";
        return url.protocol === "https:" && allowedHost && WEBHOOK_PATH.test(url.pathname) && !url.search && !url.hash ? url : null;
    } catch {
        return null;
    }
}

function jsonPayload(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(String(value));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function redactWebhook(url) {
    const parts = url.pathname.split("/");
    return `${url.protocol}//${url.host}/api/webhooks/${parts.at(-2)}/<redacted>`;
}

function isComponentsV2(payload) {
    return (Number(payload.flags) & COMPONENTS_V2_FLAG) === COMPONENTS_V2_FLAG;
}

function v2Conflicts(payload, files) {
    const fields = ["content", "embeds", "poll"].filter((field) => Object.hasOwn(payload, field) && payload[field] != null);
    if (files.length) fields.push("files[n]");
    return fields;
}

function payloadSummary(payload, files) {
    return {
        flags: payload.flags ?? 0,
        contentLength: typeof payload.content === "string" ? payload.content.length : 0,
        embeds: Array.isArray(payload.embeds) ? payload.embeds.length : 0,
        components: Array.isArray(payload.components) ? payload.components.length : 0,
        files: files.length,
    };
}

export const uploadDiscordAttachments = upload.any();

export async function sendDiscordWebhook(req, res) {
    const webhookUrl = safeWebhookUrl(req.body?.webhookUrl);
    const payload = jsonPayload(req.body?.payload_json ?? req.body?.payload);
    const files = Array.isArray(req.files) ? req.files : [];

    if (!webhookUrl || !payload) {
        console.warn("[discord-webhook] Requisição inválida:", { validWebhook: Boolean(webhookUrl), validPayload: Boolean(payload), files: files.length });
        return res.status(400).json({ error: "Webhook URL ou payload inválido." });
    }

    if (isComponentsV2(payload)) {
        const conflicts = v2Conflicts(payload, files);
        if (conflicts.length) {
            console.warn("[discord-webhook] Payload Components V2 bloqueado:", { webhook: redactWebhook(webhookUrl), conflicts });
            return res.status(400).json({ error: `Components V2 não aceita ${conflicts.join(", ")}.` });
        }
    }

    const threadId = String(req.body?.threadId ?? "").trim();
    const threadName = String(req.body?.threadName ?? "").trim();
    const appliedTags = String(req.body?.appliedTags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
    if (threadName) payload.thread_name = threadName;
    if (appliedTags.length) payload.applied_tags = appliedTags;

    const url = new URL(webhookUrl);
    url.searchParams.set("wait", "true");
    if (Array.isArray(payload.components) && payload.components.length > 0) url.searchParams.set("with_components", "true");
    if (threadId) url.searchParams.set("thread_id", threadId);

    const options = {
        method: "POST",
        headers: { "user-agent": "Shappire-Discord-Builder/2.0" },
        signal: AbortSignal.timeout(20_000),
    };

    console.info("[discord-webhook] Enviando:", { webhook: redactWebhook(webhookUrl), query: Object.fromEntries(url.searchParams), threadName: threadName || undefined, ...payloadSummary(payload, files) });
    console.info("[discord-webhook] Payload:", JSON.stringify(payload, null, 2));

    if (files.length) {
        const form = new FormData();
        form.set("payload_json", JSON.stringify(payload));
        files.forEach((file, index) => form.append(`files[${index}]`, new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" }), file.originalname));
        options.body = form;
    } else {
        options.headers["content-type"] = "application/json";
        options.body = JSON.stringify(payload);
    }

    try {
        const response = await discordFetch(url.toString(), options);
        const responseText = await response.text();
        let body = responseText;
        try { body = responseText ? JSON.parse(responseText) : null; } catch {}

        if (!response.ok) {
            console.error("[discord-webhook] Discord recusou:", {
                webhook: redactWebhook(webhookUrl),
                status: response.status,
                message: body?.message,
                code: body?.code,
                errors: body?.errors,
                body,
            });
            return res.status(response.status).json({ error: body?.message || "Discord recusou o payload.", code: body?.code, fields: body?.errors });
        }

        console.info("[discord-webhook] Enviado com sucesso:", { webhook: redactWebhook(webhookUrl), status: response.status, messageId: body?.id });
        return res.status(200).json({ ok: true, message: body });
    } catch (error) {
        console.error("[discord-webhook] Falha de rede:", {
            webhook: redactWebhook(webhookUrl),
            error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
        });
        return res.status(502).json({ error: "Não foi possível conectar ao Discord." });
    }
}
