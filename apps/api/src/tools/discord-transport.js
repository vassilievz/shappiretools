import { lookup } from "node:dns/promises";
import { Agent, fetch as undiciFetch } from "undici";

const gatewayUrl = "https://discord.com/api/v10/gateway";
const discordAgent = new Agent({ connect: { family: 4 } });

function errorDetails(error) {
    const cause = error?.cause;
    return {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        hostname: error?.hostname,
        cause: cause && {
            name: cause.name,
            message: cause.message,
            code: cause.code,
            errno: cause.errno,
            syscall: cause.syscall,
            hostname: cause.hostname,
        },
    };
}

function relevantHeaders(headers) {
    return Object.fromEntries(["server", "content-type", "cf-ray", "via"].map((name) => [name, headers.get(name)]).filter(([, value]) => value));
}

export function discordFetch(url, options = {}) {
    return undiciFetch(url, { ...options, dispatcher: discordAgent });
}

async function probe(name, request) {
    try {
        const response = await request();
        const body = await response.text();
        console.info(`[discord-transport] ${name}:`, { status: response.status, headers: relevantHeaders(response.headers), body });
    } catch (error) {
        console.error(`[discord-transport] ${name} falhou:`, errorDetails(error));
    }
}

export async function diagnoseDiscordTransport() {
    const proxyEnvironment = Object.fromEntries(["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "NODE_USE_ENV_PROXY", "GLOBAL_AGENT_HTTP_PROXY"].map((name) => [name, Boolean(process.env[name])]));
    console.info("[discord-transport] Configuração:", { proxyEnvironment, transport: "undici Agent direto, IPv4, sem ProxyAgent" });

    try {
        console.info("[discord-transport] DNS:", await lookup("discord.com", { all: true }));
    } catch (error) {
        console.error("[discord-transport] DNS falhou:", errorDetails(error));
    }

    await probe("dedicado", () => discordFetch(gatewayUrl, { signal: AbortSignal.timeout(15_000) }));
    await probe("fetch nativo", () => globalThis.fetch(gatewayUrl, { signal: AbortSignal.timeout(15_000) }));
}
