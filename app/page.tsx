"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Client = { id: string; name: string; clientDisplayName: string; kind: string; target: number; split: string; contractStartDate: string; color: string; finalContentLink?: string; handlesPosting: boolean };
type Item = { id: number; clientId: string; dateKey: string | null; title: string; clientTitle?: string; type: string; status: string; finalLink: string; clientRevisionNote?: string };
type Payload = { clients?: Client[]; items?: Item[]; session?: string; viewerEmail?: string; viewerName?: string; portalGroup?: string; error?: string };
type Month = { key: string; label: string; gregorian: string; days: number; starts: number; englishStart: string };
type ApprovalState = { item: Item; mode: "approve" | "decline" } | null;

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
const clientFilters = ["All", "Work in progress", "Waiting Client Approval", "Ready to Post", "Delivered", "Posted"];
const calendarEvents: Record<string, string> = { "Bhadra 26": "Father's Day" };

function englishDateParts(month: Month, day: number) {
  const date = new Date(`${month.englishStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return { month: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), day: date.getUTCDate(), iso: date.toISOString().slice(0, 10) };
}
function englishDate(month: Month, day: number) { const date = englishDateParts(month, day); return `${date.month} ${date.day}`; }
function englishDateCompact(month: Month, day: number) {
  const current = englishDateParts(month, day);
  const previous = day > 1 ? englishDateParts(month, day - 1) : null;
  const next = day < month.days ? englishDateParts(month, day + 1) : null;
  return day === 1 || day === month.days || previous?.month !== current.month || next?.month !== current.month ? `${current.month} ${current.day}` : String(current.day);
}
function dateOrder(dateKey: string | null | undefined) { if (!dateKey) return -1; const [name, day] = dateKey.split(" "); return months.findIndex((month) => month.key === name) * 40 + Number(day || 0); }
function todayKathmanduIso() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function todayNepaliKey() {
  const today = todayKathmanduIso();
  for (const month of months) for (let day = 1; day <= month.days; day += 1) if (englishDateParts(month, day).iso === today) return `${month.key} ${day}`;
  return "";
}
function displayStatus(status: string) {
  if (status === "Delivered") return "Delivered";
  if (status === "Waiting Client Approval") return "Waiting Client Approval";
  if (status === "Ready to Post") return "Ready to Post";
  if (status === "Posted") return "Posted";
  return "Work in progress";
}
function statusClass(status: string) { return displayStatus(status).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function matchesFilter(item: Item, filter: string) { return filter === "All" || displayStatus(item.status) === filter; }
function isComplete(item: Item, client?: Client) { return client?.handlesPosting ? item.status === "Posted" : ["Delivered", "Approved", "Posted"].includes(item.status); }
function typeClass(type: string) { const value = type.toLowerCase(); if (value.includes("tiktok")) return "type-tiktok"; if (value.includes("professional")) return "type-professional"; if (value.includes("graphic") || value.includes("photo")) return "type-graphic"; return "type-video"; }
function randomSessionId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function Icon({ name, size = 17 }: { name: "calendar" | "list" | "link" | "close" | "check" | "message"; size?: number }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".5"/><circle cx="3.5" cy="12" r=".5"/><circle cx="3.5" cy="18" r=".5"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2A5 5 0 0 0 12 4l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const [invite, setInvite] = useState({ clientId: "", token: "" });
  const [data, setData] = useState<Payload | null>(null);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [filter, setFilter] = useState("All");
  const [activeClientId, setActiveClientId] = useState("");
  const [monthIndex, setMonthIndex] = useState(0);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [approval, setApproval] = useState<ApprovalState>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const sessionNumberRef = useRef(0);
  const tabSessionIdRef = useRef("");
  const tabSessionStartedRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const openedAtRef = useRef(0);
  const activeMsRef = useRef(0);
  const activeStartedAtRef = useRef(0);
  const reportedActiveSecondsRef = useRef(0);
  const authSessionRef = useRef("");
  const inviteClientIdRef = useRef("");

  const stopActiveClock = useCallback(() => {
    if (!activeStartedAtRef.current) return;
    activeMsRef.current += Math.max(0, Date.now() - activeStartedAtRef.current);
    activeStartedAtRef.current = 0;
  }, []);
  const syncActiveClock = useCallback(() => {
    stopActiveClock();
    if (document.visibilityState === "visible" && document.hasFocus()) activeStartedAtRef.current = Date.now();
  }, [stopActiveClock]);
  const endCurrentSession = useCallback(async (reason: string, beacon = false) => {
    if (sessionEndedRef.current || !tabSessionStartedRef.current || !tabSessionIdRef.current || !authSessionRef.current || !inviteClientIdRef.current) return;
    sessionEndedRef.current = true;
    stopActiveClock();
    const openSeconds = Math.max(1, Math.round((Date.now() - openedAtRef.current) / 1000));
    const activeSeconds = Math.min(openSeconds, Math.max(0, Math.round(activeMsRef.current / 1000)));
    const payload = JSON.stringify({ action: "clientPortalSessionEnd", clientId: inviteClientIdRef.current, session: authSessionRef.current, sessionId: tabSessionIdRef.current, sessionNumber: sessionNumberRef.current, openSeconds, activeSeconds, reason });
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(`${MAIN_CALENDAR_URL}/api/workspace`, new Blob([payload], { type: "text/plain;charset=UTF-8" })); return; }
    try { await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Portal-Session": authSessionRef.current }, body: payload, keepalive: true }); } catch {}
  }, [stopActiveClock]);

  const fetchPortal = useCallback(async (session: string, clientId: string, token: string, showLoader = true) => {
    if (!clientId || !token) return;
    if (showLoader) setLoading(true);
    setError("");
    try {
      const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace?view=client&clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(token)}`, { cache: "no-store", headers: { "X-Client-Portal-Session": session } });
      const body = await response.json() as Payload;
      if (!response.ok) throw new Error(body.error || "Unable to load your portal");
      setData({ ...body, session });
      setEmail(body.viewerEmail || "");
      authSessionRef.current = session;
      window.sessionStorage.setItem(`layaa-portal-cache:${clientId}`, JSON.stringify(body));
      setActiveClientId((current) => current || body.clients?.find((client) => client.id === clientId)?.id || body.clients?.[0]?.id || "");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to load your portal";
      if (/sign-in|required|invalid|expired/i.test(message)) {
        window.localStorage.removeItem(`layaa-portal-session:${clientId}`);
        window.sessionStorage.removeItem(`layaa-portal-cache:${clientId}`);
        setData(null);
      }
      setError(message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      await Promise.resolve();
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      const raw = String(params.get("invite") || "").trim();
      const separator = raw.indexOf(".");
      const clientId = params.get("clientId") || (separator > 0 ? raw.slice(0, separator) : "");
      const token = params.get("token") || (separator > 0 ? raw.slice(separator + 1) : "");
      setInvite({ clientId, token });
      inviteClientIdRef.current = clientId;
      if (!clientId || !token) { setError("This private calendar link is not available. Please ask the Layaa team for the correct link."); setLoading(false); return; }
      const stored = window.localStorage.getItem(`layaa-portal-session:${clientId}`);
      const cached = window.sessionStorage.getItem(`layaa-portal-cache:${clientId}`);
      if (!stored) { setLoading(false); return; }
      authSessionRef.current = stored;
      if (cached) {
        try {
          const payload = JSON.parse(cached) as Payload;
          setData({ ...payload, session: stored });
          setEmail(payload.viewerEmail || "");
          setActiveClientId(payload.clients?.find((client) => client.id === clientId)?.id || payload.clients?.[0]?.id || "");
          setLoading(false);
        } catch { window.sessionStorage.removeItem(`layaa-portal-cache:${clientId}`); }
      }
      void fetchPortal(stored, clientId, token, !cached);
    };
    void initialize();
    return () => { cancelled = true; };
  }, [fetchPortal]);

  useEffect(() => {
    const authSession = data?.session;
    if (!authSession || !invite.clientId || tabSessionStartedRef.current) return;
    tabSessionStartedRef.current = true;
    sessionEndedRef.current = false;
    tabSessionIdRef.current = randomSessionId();
    openedAtRef.current = Date.now();
    activeMsRef.current = 0;
    reportedActiveSecondsRef.current = 0;
    authSessionRef.current = authSession;
    inviteClientIdRef.current = invite.clientId;
    syncActiveClock();
    const start = async () => {
      try {
        const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Portal-Session": authSession }, body: JSON.stringify({ action: "clientPortalSessionStart", clientId: invite.clientId, session: authSession, sessionId: tabSessionIdRef.current }) });
        const body = await response.json();
        if (response.ok && body.usageSession?.sessionNumber) { sessionNumberRef.current = Number(body.usageSession.sessionNumber); }
      } catch {}
    };
    void start();
    const heartbeat = async () => {
      stopActiveClock();
      const totalActiveSeconds = Math.max(0, Math.round(activeMsRef.current / 1000));
      const activeIncrement = Math.max(0, totalActiveSeconds - reportedActiveSecondsRef.current);
      reportedActiveSecondsRef.current = totalActiveSeconds;
      if (document.visibilityState === "visible" && document.hasFocus()) activeStartedAtRef.current = Date.now();
      try { await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Portal-Session": authSession }, body: JSON.stringify({ action: "clientPortalSessionHeartbeat", clientId: invite.clientId, session: authSession, sessionId: tabSessionIdRef.current, activeIncrement }) }); } catch {}
    };
    const onPageHide = () => { void endCurrentSession("tab_closed", true); };
    document.addEventListener("visibilitychange", syncActiveClock);
    window.addEventListener("focus", syncActiveClock);
    window.addEventListener("blur", syncActiveClock);
    window.addEventListener("pagehide", onPageHide);
    const timer = window.setInterval(heartbeat, 15000);
    return () => {
      document.removeEventListener("visibilitychange", syncActiveClock);
      window.removeEventListener("focus", syncActiveClock);
      window.removeEventListener("blur", syncActiveClock);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(timer);
    };
  }, [data?.session, invite.clientId, syncActiveClock, stopActiveClock, endCurrentSession]);

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3600); return () => window.clearTimeout(timer); }, [notice]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!invite.clientId || !invite.token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !pin.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clientPortalLogin", clientId: invite.clientId, inviteToken: invite.token, email: normalizedEmail, pin: pin.trim() }) });
      const body = await response.json() as Payload;
      if (!response.ok || !body.session) throw new Error(body.error || "Unable to sign in");
      window.localStorage.setItem(`layaa-portal-session:${invite.clientId}`, body.session);
      window.sessionStorage.setItem(`layaa-portal-cache:${invite.clientId}`, JSON.stringify(body));
      authSessionRef.current = body.session;
      setData(body);
      setEmail(body.viewerEmail || normalizedEmail);
      setActiveClientId(body.clients?.find((client) => client.id === invite.clientId)?.id || body.clients?.[0]?.id || "");
      setPin("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in"); }
    finally { setBusy(false); }
  }

  async function record(event: string, extra: Record<string, unknown> = {}, clientId = activeClientId) {
    if (!data?.session || !clientId) return;
    try { await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Portal-Session": data.session }, body: JSON.stringify({ action: "clientPortalActivity", session: data.session, sessionId: tabSessionIdRef.current, clientId, event, ...extra }) }); } catch {}
  }

  async function logout() {
    setBusy(true);
    await record("signed_out");
    await endCurrentSession("signed_out");
    window.localStorage.removeItem(`layaa-portal-session:${invite.clientId}`);
    window.sessionStorage.removeItem(`layaa-portal-cache:${invite.clientId}`);
    tabSessionStartedRef.current = false; sessionEndedRef.current = false; tabSessionIdRef.current = ""; activeMsRef.current = 0; activeStartedAtRef.current = 0;
    sessionNumberRef.current = 0;
    setData(null); setPin(""); setError(""); setBusy(false);
  }

  async function submitDecision(event: FormEvent) {
    event.preventDefault();
    if (!approval || !data?.session || (approval.mode === "decline" && !revisionNote.trim())) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${MAIN_CALENDAR_URL}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-Client-Portal-Session": data.session }, body: JSON.stringify({ action: "clientPortalDecision", clientId: invite.clientId, session: data.session, sessionId: tabSessionIdRef.current, itemId: approval.item.id, decision: approval.mode, note: revisionNote.trim() }) });
      const body = await response.json() as { item?: Item; error?: string };
      if (!response.ok || !body.item) throw new Error(body.error || "Unable to save your decision");
      setData((current) => current ? { ...current, items: (current.items || []).map((item) => item.id === body.item!.id ? body.item! : item) } : current);
      window.sessionStorage.removeItem(`layaa-portal-cache:${invite.clientId}`);
      setNotice(approval.mode === "approve" ? (activeClient?.handlesPosting ? "Approved — ready for the Layaa team to post." : "Approved — marked as delivered.") : "Change request sent to the Layaa team.");
      setApproval(null); setRevisionNote("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save your decision"); }
    finally { setBusy(false); }
  }

  const clients = data?.clients || [];
  const activeClient = clients.find((client) => client.id === activeClientId) || clients[0];
  const month = months[monthIndex];
  const allItems = (data?.items || []).filter((item) => item.clientId === activeClient?.id);
  const availableFilters = clientFilters.filter((status) => status === "All" || allItems.some((item) => displayStatus(item.status) === status));
  const filteredItems = allItems.filter((item) => matchesFilter(item, filter));
  const monthVisibleItems = filteredItems.filter((item) => item.dateKey?.startsWith(`${month.key} `));
  const monthAllItems = allItems.filter((item) => item.dateKey?.startsWith(`${month.key} `));
  const completed = allItems.filter((item) => isComplete(item, activeClient)).length;
  const progress = activeClient?.target ? Math.min(100, Math.round(completed / activeClient.target * 100)) : 0;
  const approvals = allItems.filter((item) => item.status === "Waiting Client Approval");
  const cells: Array<number | null> = [...Array.from({ length: month.starts }, () => null), ...Array.from({ length: month.days }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const itemMap = new Map<number, Item[]>();
  monthVisibleItems.forEach((item) => { const day = Number(item.dateKey?.split(" ")[1]); if (day) itemMap.set(day, [...(itemMap.get(day) || []), item]); });
  const todayKey = todayNepaliKey();

  if (loading) return <main className="portal-shell loading-screen"><Brand/><div className="loading-pulse"/><p>Opening your private calendar…</p></main>;
  if (!invite.clientId || !invite.token) return <main className="portal-shell empty-screen"><Brand/><p className="eyebrow">Private client portal</p><h1>Calendar link unavailable</h1><p>{error}</p></main>;
  if (!data?.session) return <main className="portal-shell auth-screen"><Brand/><section className="auth-card"><p className="eyebrow">Private client portal</p><h1>Sign in to your calendar</h1><p>Use your own email address and the private PIN shared by the Layaa team.</p><form onSubmit={login}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required/></label><label>Portal PIN<input type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter your PIN" autoComplete="current-password" required/></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Open client portal"}</button></form></section></main>;

  return <main className="portal-shell">
    <header className="portal-topbar"><Brand/><span className="portal-label">CLIENT PORTAL</span><span className="secure-label"><span className="secure-dot"/> {data.viewerEmail || email}</span><button className="text-button" onClick={logout} disabled={busy}>Sign out</button></header>
    {clients.length > 1 && <nav className="client-tabs" aria-label="Client workspaces">{clients.map((client) => <button key={client.id} data-active={client.id === activeClient?.id} onClick={() => { setActiveClientId(client.id); setMonthIndex(0); setFilter("All"); void record("tab_changed", { tab: client.clientDisplayName || client.name }, client.id); }}>{client.clientDisplayName || client.name}</button>)}</nav>}
    {activeClient && <>
      <section className="portal-hero" style={{ "--client-color": activeClient.color || "#17594f" } as React.CSSProperties}><div><p className="eyebrow">Content calendar · {activeClient.kind}</p><h1>{activeClient.clientDisplayName || activeClient.name}</h1><p>Your plan, progress, approvals, and final delivery links in one place.</p>{activeClient.id === "beyond-trend" && <small className="portal-activity-note">Recorded active time counts only while this portal is visible and focused.</small>}</div><div className="hero-meta"><span>{activeClient.split || "Monthly content plan"}</span>{activeClient.finalContentLink && <a href={activeClient.finalContentLink} target="_blank" rel="noreferrer" onClick={() => void record("drive_opened", { title: "Final content folder" })}><Icon name="link" size={15}/> Final Drive folder</a>}</div></section>
      <section className="stats-grid"><article><span>This month</span><strong>{monthAllItems.length}</strong><small>scheduled items</small></article><article><span>Completed</span><strong>{completed}</strong><small>out of {activeClient.target || "—"}</small></article><article><span>Progress</span><strong>{progress}%</strong><div className="progress"><span style={{ width: `${progress}%` }}/></div></article><button className="approval-stat" onClick={() => document.getElementById("client-approvals")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>Waiting for approval</span><strong>{approvals.length}</strong><small>Open review queue</small></button></section>
      <section className="approval-panel" id="client-approvals"><div className="section-title"><div><p className="eyebrow">Your review queue</p><h2>Waiting for your approval</h2><p>Open the final video, then approve it or send a clear change request.</p></div><span>{approvals.length} {approvals.length === 1 ? "video" : "videos"}</span></div>{approvals.length ? <div className="approval-list">{approvals.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.dateKey || "Unscheduled"} · {item.type}</small></div>{item.finalLink ? <a href={item.finalLink} target="_blank" rel="noreferrer" onClick={() => void record("approval_opened", { itemId: item.id, title: item.title })}><Icon name="link" size={15}/> Open final video</a> : <span className="missing-link">Final video link pending</span>}<div><button className="approve-button" onClick={() => { setApproval({ item, mode: "approve" }); setRevisionNote(""); void record("approval_opened", { itemId: item.id, title: item.title }); }}><Icon name="check" size={15}/> Approve</button><button className="changes-button" onClick={() => { setApproval({ item, mode: "decline" }); setRevisionNote(""); void record("approval_opened", { itemId: item.id, title: item.title }); }}><Icon name="message" size={15}/> Request changes</button></div></article>)}</div> : <div className="approval-empty"><Icon name="check" size={21}/><span><strong>You&apos;re all caught up</strong><small>No videos are waiting for approval right now.</small></span></div>}</section>
      <section className="calendar-panel"><div className="calendar-head"><div><p className="eyebrow">Work plan · {month.gregorian}</p><h2>Content calendar</h2></div><div className="calendar-tools"><button disabled={monthIndex === 0} onClick={() => { const next = Math.max(0, monthIndex - 1); setMonthIndex(next); void record("month_changed", { month: months[next].label }); }} aria-label="Previous month">‹</button><strong>{month.label}</strong><button disabled={monthIndex === months.length - 1} onClick={() => { const next = Math.min(months.length - 1, monthIndex + 1); setMonthIndex(next); void record("month_changed", { month: months[next].label }); }} aria-label="Next month">›</button><div className="view-switch"><button data-active={view === "calendar"} onClick={() => setView("calendar")}><Icon name="calendar" size={15}/> Calendar</button><button data-active={view === "list"} onClick={() => setView("list")}><Icon name="list" size={15}/> List</button></div></div></div><div className="filter-row">{availableFilters.map((status) => <button key={status} data-active={filter === status} onClick={() => setFilter(status)}>{status}</button>)}</div>
        {view === "calendar" ? <div className="calendar-scroll"><div className="calendar-grid"><div className="weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-cells">{cells.map((day, index) => {
          if (!day) return <div className="calendar-cell unavailable" key={`${month.key}-empty-${index}`}/>;
          const key = `${month.key} ${day}`;
          const preContract = activeClient.contractStartDate && dateOrder(key) < dateOrder(activeClient.contractStartDate);
          const isToday = key === todayKey;
          const eventLabel = calendarEvents[key];
          return <div className={`calendar-cell ${preContract ? "pre-contract" : ""} ${isToday ? "today" : ""} ${eventLabel ? "has-event" : ""}`} key={key}><div className="date-line"><strong>{day}</strong>{isToday && <b>Today</b>}</div>{eventLabel && <div className="calendar-event"><Icon name="calendar" size={11}/><span>{eventLabel}</span></div>}<div className="cell-items">{(itemMap.get(day) || []).map((item) => <article className={`calendar-item ${typeClass(item.type)}`} key={item.id} onClick={() => void record("viewed", { itemId: item.id, title: item.title })}><h3>{item.title}</h3><span className={`status ${statusClass(item.status)}`}>{displayStatus(item.status)}</span>{item.finalLink && <a href={item.finalLink} target="_blank" rel="noreferrer" aria-label={`Open final video for ${item.title}`} onClick={(event) => { event.stopPropagation(); void record("drive_opened", { itemId: item.id, title: item.title }); }}><Icon name="link" size={12}/></a>}</article>)}</div><small className="english-date">{englishDateCompact(month, day)}</small></div>;
        })}</div></div></div> : <div className="list-view">{monthVisibleItems.length ? [...monthVisibleItems].sort((a, b) => dateOrder(a.dateKey) - dateOrder(b.dateKey)).map((item) => <article className="list-item" key={item.id} onClick={() => void record("viewed", { itemId: item.id, title: item.title })}><div><span>{item.dateKey} · {item.dateKey ? englishDate(month, Number(item.dateKey.split(" ")[1])) : ""}</span><h3>{item.title}</h3><small>{item.type}</small></div><div><i className={`status ${statusClass(item.status)}`}>{displayStatus(item.status)}</i>{item.finalLink && <a href={item.finalLink} target="_blank" rel="noreferrer" onClick={(event) => { event.stopPropagation(); void record("drive_opened", { itemId: item.id, title: item.title }); }}><Icon name="link" size={13}/> Final video</a>}</div></article>) : <div className="empty-calendar"><h3>No items in this view</h3><p>Try another month or status.</p></div>}</div>}
      </section>
    </>}
    <footer><span>Prepared by LAYAA</span><span>Questions or changes? <a href="tel:+9779709046069">+977 9709046069</a> · <a href="https://wa.me/9779709046069" target="_blank" rel="noreferrer">WhatsApp</a></span></footer>
    {approval && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setApproval(null)}><form className="decision-modal" onSubmit={submitDecision}><div className="modal-head"><div><p className="eyebrow">Client approval</p><h2>{approval.mode === "approve" ? "Approve this video?" : "Request changes"}</h2></div><button type="button" onClick={() => setApproval(null)} aria-label="Close"><Icon name="close"/></button></div><div className="decision-item"><strong>{approval.item.title}</strong><small>{approval.item.dateKey || "Unscheduled"} · {approval.item.type}</small></div>{approval.item.finalLink && <a className="modal-video-link" href={approval.item.finalLink} target="_blank" rel="noreferrer" onClick={() => void record("drive_opened", { itemId: approval.item.id, title: approval.item.title })}><Icon name="link" size={15}/> Open final video</a>}{approval.mode === "approve" ? <p className="decision-copy">{activeClient?.handlesPosting ? "Approving marks this video Ready to Post. It will be completed after the Layaa team posts it." : "Approving marks this video Delivered and complete."}</p> : <label>What should be changed?<textarea autoFocus value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} rows={6} placeholder="Describe the exact changes: opening, shots, captions, music, pacing, colors, or anything else…" required/><small>Your note is saved with this video for the Layaa team.</small></label>}{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setApproval(null)}>Cancel</button><button className={approval.mode === "approve" ? "approve-button" : "changes-button"} disabled={busy || (approval.mode === "decline" && !revisionNote.trim())}>{busy ? "Saving…" : approval.mode === "approve" ? "Confirm approval" : "Send change request"}</button></div></form></div>}
    {notice && <div className="toast">{notice}</div>}
  </main>;
}

function Brand() { return <div className="brand-lockup"><strong>layaa</strong><span>Content calendar</span></div>; }
