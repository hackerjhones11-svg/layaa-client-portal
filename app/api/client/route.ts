import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let clientId = String(url.searchParams.get("clientId") ?? "").trim();
  let token = String(url.searchParams.get("token") ?? "").trim();
  const invite = String(url.searchParams.get("invite") ?? "").trim();
  if ((!clientId || !token) && invite.includes(".")) {
    const separator = invite.indexOf(".");
    clientId = clientId || invite.slice(0, separator);
    token = token || invite.slice(separator + 1);
  }
  if (!clientId || !token) return Response.json({ error: "This invite link is incomplete." }, { status: 400 });
  const mainUrl = String(env.LAYAA_MAIN_CALENDAR_URL ?? "https://layaa-content-calendar.aavashrzxx.chatgpt.site").replace(/\/$/, "");
  try {
    const response = await fetch(`${mainUrl}/api/workspace?view=client&clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The calendar is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
