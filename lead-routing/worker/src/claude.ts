// One place that builds the Claude client, so every call can go through Cloudflare AI Gateway.
// With AI_GATEWAY_URL set, calls go to the gateway, which forwards them to Anthropic from a
// fixed place: the Worker's own location stops mattering, which ends the "403 Request not
// allowed" errors from regions Anthropic doesn't serve. The gateway also logs every call.
// Empty: calls go straight to api.anthropic.com, as before.
import Anthropic from "@anthropic-ai/sdk";

export type ClaudeRoute = {
  // https://gateway.ai.cloudflare.com/v1/<account id>/<gateway name>/anthropic
  baseURL?: string;
  // Only when the gateway has "Authenticated Gateway" turned on.
  token?: string;
};

export function claudeRoute(env: { AI_GATEWAY_URL?: string; AI_GATEWAY_TOKEN?: string }): ClaudeRoute {
  const baseURL = env.AI_GATEWAY_URL?.trim().replace(/\/+$/, "");
  const token = env.AI_GATEWAY_TOKEN?.trim();
  return { baseURL: baseURL || undefined, token: token || undefined };
}

export function claudeClient(apiKey: string, timeoutMs: number, route: ClaudeRoute = {}): Anthropic {
  return new Anthropic({
    apiKey,
    timeout: timeoutMs,
    maxRetries: 0,
    ...(route.baseURL ? { baseURL: route.baseURL } : {}),
    ...(route.token ? { defaultHeaders: { "cf-aig-authorization": `Bearer ${route.token}` } } : {}),
  });
}
