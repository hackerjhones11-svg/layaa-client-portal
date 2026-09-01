"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Client = { id: string; name: string; clientDisplayName: string; kind: string; target: number; split: string; color: string; finalContentLink?: string; handlesPosting: boolean };
type Item = { id: number; clientId: string; dateKey: string | null; title: string; type: string; status: string; finalLink: string };
type Payload = { clients?: Client[]; items?: Item[]; session?: string; viewerUsername?: string; portalGroup?: string; error?: string };
type Month = { key: string; label: string; gregorian: string; days: number; starts: number; englishStart: string };

const MAIN_CALENDAR_URL = "https://layaa-content-calendar.aavashrzxx.chatgpt.site";
const months: Month[] = [
  { key: "Bhadra", label: "Bhadra 2083", gregorian: "Aug / Sep 2026", days: 31, starts: 1, englishStart: "2026-08-17" },
  { key: "Ashoj", label: "Ashoj 2083", gregorian: "Sep / Oct 2026", days: 31, starts: 4, englishStart: "2026-09-17" },
  { key: "Kartik", label: "Kartik 2083", gregorian: "Oct / Nov 2026", days: 30, starts: 0, englishStart: "2026-10-18" },
  { key: "Mangsir", label: "Mangsir 2083", gregorian: "Nov / Dec 2026", days: 30, starts: 2, englishStart: "2026-11-17" },
  { key: "Poush", label: "Poush 2083", gregorian: "Dec 2026 / Jan 2027", days: 30, starts: 3, englishStart: "2026-12-17" },
  { key: "Magh", label: "Magh 2083", gregorian: "Jan / Feb 2027", days: 29, starts: 5, englishStart: "2027-01-16" },
  { key: "Falgun", label: "Falgun 2083", gregorian: "Feb / Mar 2027", days: 30, starts: 6, englishStart: "2027-02-14" },
  { key: "Chaitra", label: "Chaitra 2083", gregorian: "Mar / Apr 2027", days: 30, starts: 1, englishStart: "2027-03-16" },
  { key: "Baisakh", label: "Baisakh 2084", gregorian: "Apr / May 2027", days: 31, starts: 3, englishStart: "2027-04-15" },
];
const statuses = ["All", "Planned", "Script Ready", "Shot", "Editing", "Waiting Client Approval", "Declined by Client (Need Revision)", "Delivered", "Posted"];
const statusClass = (status: string) => status.toLowerCase().replace(/[^a-z]+/g, "-");
function englishDate(month: Month, day: number) { const date = new Date(`${month.englishStart}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + day - 1); return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); }

export default function Home() {
  const [invite, setInvite] = useState({ clientId: "", token: "" });
  const [data, setData] = useState<Payload | null>(null);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [filter, setFilter] = useState("All");
  const [activeClientId, setActiveClientId] = useState("");
  const [monthIndex, setMonthIndex] = useState(0);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = String(params.get("invite") || "").trim();
    const separator = raw.indexOf(".");
    const clientId = params.get("clientId") || (separator > 0 ? raw.slice(0, separator) : "");
    const token = params.get("token") || (separator > 0 ? raw.slice(separator + 1) : "");
    setInvite({ clientId, token });
    if (!clientId || !token) { setError("This invite is not available. Please ask the Layaa team for a fresh link."); setLoading(false); return; }
    const sessionKey = `layaa-portal-session:${clientId}`;
    const cacheKey = `layaa-portal-cache:${clientId}`;
    const stored = window.localStorage.getItem(sessionKey);
    if (!stored) { setLoading(false); return; }
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const payload = JSON.parse(cached) as Payload;
        setData({ ...payload, session: stored });
        setActiveClientId(payload.clients?.find((client) => client.id === clientId)?.id || payload.clients?.[0]?.id || "");
        setLoading(false);
        void fetchPortal(stored, clientId, token, false);
        return;
      } catch { window.sessionStorage.removeItem(cacheKey); }
    }
    void fetchPortal(stored, clientId, token, true);
  }, []);

  async function fetchPortal(session: string, clientId = invite.clientId, token = invite.token, showLoader = true) {
    if (!clientId || !token) return;
    if (showLoader) setLoading(true);
    setError("");
    try {
      const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace?view=client&clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(token)}`, { cache: "no-store", headers: { "X-Client-Portal-Session": session } });
      const body = await response.json() as Payload;
      if (!response.ok) throw new Error(body.error || "Unable to load your portal");
      setData({ ...body, session });
      window.sessionStorage.setItem(`layaa-portal-cache:${clientId}`, JSON.stringify(body));
      setActiveClientId((current) => current || body.clients?.find((client) => client.id === clientId)?.id || body.clients?.[0]?.id || "");
    } catch (reason) {
      window.localStorage.removeItem(`layaa-portal-session:${clientId}`);
      window.sessionStorage.removeItem(`layaa-portal-cache:${clientId}`);
      setData(null); setError(reason instanceof Error ? reason.message : "Unable to load your portal");
    } finally { setLoading(false); }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!invite.clientId || !invite.token || !username.trim() || !pin.trim()) return;
    setLoggingIn(true); setError("");
    try {
      const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clientPortalLogin", clientId: invite.clientId, inviteToken: invite.token, username: username.trim(), pin: pin.trim() }) });
      const body = await response.json() as Payload;
      if (!response.ok || !body.session) throw new Error(body.error || "Unable to sign in");
      window.localStorage.setItem(`layaa-portal-session:${invite.clientId}`, body.session);
      window.sessionStorage.setItem(`layaa-portal-cache:${invite.clientId}`, JSON.stringify(body));
      setData(body); setActiveClientId(body.clients?.find((client) => client.id === invite.clientId)?.id || body.clients?.[0]?.id || ""); setPin("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in"); }
    finally { setLoggingIn(false); }
  }

  function logout() { window.localStorage.removeItem(`layaa-portal-session:${invite.clientId}`); window.sessionStorage.removeItem(`layaa-portal-cache:${invite.clientId}`); setData(null); setUsername(""); setPin(""); setError(""); }

  async function record(event: string, extra: Record<string, unknown> = {}, clientId = activeClientId) {
    if (!data?.session || !clientId) return;
    try {
      const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Portal-Session": data.session }, body: JSON.stringify({ action: "clientPortalActivity", session: data.session, clientId, event, ...extra }) });
      await response.text();
    } catch {}
  }

  const clients = data?.clients || [];
  const activeClient = clients.find((client) => client.id === activeClientId) || clients[0];
  const visibleStatuses = activeClient?.handlesPosting ? statuses : statuses.filter((status) => status !== "Posted");
  const month = months[monthIndex];
  const allItems = (data?.items || []).filter((item) => item.clientId === activeClient?.id);
  const filteredItems = filter === "All" ? allItems : allItems.filter((item) => item.status === filter);
  const monthItems = filteredItems.filter((item) => item.dateKey?.startsWith(`${month.key} `));
  const scheduledThisMonth = allItems.filter((item) => item.dateKey?.startsWith(`${month.key} `)).length;
  const delivered = allItems.filter((item) => ["Delivered", "Posted"].includes(item.status)).length;
  const progress = activeClient?.target ? Math.min(100, Math.round(delivered / activeClient.target * 100)) : 0;
  const cells: Array<number | null> = [...Array.from({ length: month.starts }, () => null), ...Array.from({ length: month.days }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const itemMap = useMemo(() => { const map = new Map<number, Item[]>(); monthItems.forEach((item) => { const day = Number(item.dateKey?.split(" ")[1]); if (day) map.set(day, [...(map.get(day) || []), item]); }); return map; }, [monthItems]);

  if (loading) return <main className="shell loading-screen"><div className="loader-wordmark">LAYAA</div><p>Opening your private calendar…</p></main>;
  if (!invite.clientId || !invite.token) return <main className="shell empty-screen"><Brand/><h1>Private calendar link</h1><p>{error}</p></main>;
  if (!data?.session) return <main className="shell auth-screen"><Brand/><section className="auth-card"><p className="eyebrow">PRIVATE CLIENT PORTAL</p><h1>Sign in to your calendar</h1><p>Enter the username and private PIN provided by Layaa.</p><form onSubmit={login}><label>Username<input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} placeholder="Enter your username" autoComplete="username" required/></label><label>Portal PIN<input type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter your PIN" autoComplete="current-password" required/></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={loggingIn}>{loggingIn ? "Signing in…" : "Open client portal"}</button></form></section></main>;

  return <main className="shell">
    <header className="topbar"><Brand/><span className="portal-label">CLIENT PORTAL</span><span className="secure-label"><span className="secure-dot"/> Signed in as {data.viewerUsername || username}</span><button className="text-button" onClick={logout}>Sign out</button></header>
    {clients.length > 1 && <nav className="client-tabs" aria-label="Client workspaces">{clients.map((client) => <button key={client.id} data-active={client.id === activeClient?.id} onClick={() => { setActiveClientId(client.id); setMonthIndex(0); setFilter("All"); void record("tab_changed", { tab: client.clientDisplayName || client.name }, client.id); }}>{client.clientDisplayName || client.name}</button>)}</nav>}
    {activeClient && <>
      <section className="hero" style={{ "--client-color": activeClient.color || "#17594f" } as React.CSSProperties}><div><p className="eyebrow">CONTENT CALENDAR · {activeClient.kind.toUpperCase()}</p><h1>{activeClient.clientDisplayName || activeClient.name}</h1><p className="hero-sub">Your content plan, progress, approvals, and final delivery links in one place.</p></div><div className="hero-meta"><span>{activeClient.split || "Monthly content plan"}</span>{activeClient.finalContentLink && <a href={activeClient.finalContentLink} target="_blank" rel="noreferrer" onClick={() => void record("drive_opened", { title: "Final content folder" })}>Final Drive folder ↗</a>}</div></section>
      <section className="stats-grid"><article><span className="stat-label">This month</span><strong>{scheduledThisMonth}</strong><span className="stat-note">scheduled items</span></article><article><span className="stat-label">Delivered</span><strong>{delivered}</strong><span className="stat-note">of {activeClient.target || "—"} target</span></article><article><span className="stat-label">Progress</span><strong>{progress}%</strong><div className="progress"><span style={{ width: `${progress}%` }}/></div></article></section>
      <section className="calendar-panel"><div className="section-head"><div><p className="eyebrow">WORK PLAN · {month.gregorian}</p><h2>Content calendar</h2></div><div className="calendar-tools"><button onClick={() => { const next = Math.max(0, monthIndex - 1); setMonthIndex(next); void record("month_changed", { month: months[next].label }); }} disabled={monthIndex === 0}>‹</button><strong>{month.label}</strong><button onClick={() => { const next = Math.min(months.length - 1, monthIndex + 1); setMonthIndex(next); void record("month_changed", { month: months[next].label }); }} disabled={monthIndex === months.length - 1}>›</button><div className="view-switch"><button data-active={view === "calendar"} onClick={() => setView("calendar")}>Calendar</button><button data-active={view === "list"} onClick={() => setView("list")}>List</button></div></div></div>
        <div className="filter-row">{visibleStatuses.map((status) => <button key={status} className={filter === status ? "filter active" : "filter"} onClick={() => setFilter(status)}>{status}</button>)}</div>
        {view === "calendar" ? <div className="calendar-grid"><div className="weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-cells">{cells.map((day, index) => <div className={`calendar-cell ${day ? "" : "muted"}`} key={`${month.key}-${index}`}><div className="date-line"><strong>{day || ""}</strong>{day && <small>{englishDate(month, day)}</small>}</div>{day && (itemMap.get(day) || []).map((item) => <article className="calendar-item" key={item.id} onClick={() => void record("viewed", { itemId: item.id, title: item.title })}><span className="type-chip">{item.type}</span><h3>{item.title}</h3><span className={`status ${statusClass(item.status)}`}>{item.status}</span>{item.finalLink && <a href={item.finalLink} target="_blank" rel="noreferrer" onClick={(event) => { event.stopPropagation(); void record("drive_opened", { itemId: item.id, title: item.title }); }}>Final Drive ↗</a>}</article>)}</div>)}</div></div> : <div className="list-view">{monthItems.length ? monthItems.map((item) => <article className="list-item" key={item.id} onClick={() => void record("viewed", { itemId: item.id, title: item.title })}><div><span className="eyebrow">{item.dateKey}</span><h3>{item.title}</h3><span className="type-chip">{item.type}</span></div><div><span className={`status ${statusClass(item.status)}`}>{item.status}</span>{item.finalLink && <a href={item.finalLink} target="_blank" rel="noreferrer" onClick={(event) => { event.stopPropagation(); void record("drive_opened", { itemId: item.id, title: item.title }); }}>Final Drive ↗</a>}</div></article>) : <div className="empty-calendar"><h3>No items in this view</h3><p>Try another month or status filter.</p></div>}</div>}
      </section>
    </>}
    <footer><span>Prepared by LAYAA</span><span>Questions or changes? Contact your Layaa team · <a href="tel:+9779709046069">+977 9709046069</a> · <a href="https://wa.me/9779709046069" target="_blank" rel="noreferrer">WhatsApp</a></span></footer>
  </main>;
}

function Brand() { return <div className="brand-lockup">LAYAA</div>; }
