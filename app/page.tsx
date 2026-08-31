"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { id: string; name: string; kind: string; target: number; split: string; color: string; finalContentLink?: string };
type Item = { id: number; dateKey: string | null; title: string; type: string; status: string; owner: string; notes: string; rawLink: string; finalLink: string };
type Payload = { client?: Client; items?: Item[]; error?: string };

const statuses = ["All", "Planned", "Shot", "Editing", "Waiting Client Approval", "Delivered", "Declined by CD"];
const statusClass = (status: string) => status.toLowerCase().replace(/[^a-z]+/g, "-");

export default function Home() {
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/client${window.location.search}`, { cache: "no-store" })
      .then(async (response) => { const body = (await response.json()) as Payload; if (!response.ok) throw new Error(body.error || "Unable to load calendar"); return body; })
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load calendar"))
      .finally(() => setLoading(false));
  }, []);

  const items = data?.items ?? [];
  const visibleItems = useMemo(() => filter === "All" ? items : items.filter((item) => item.status === filter), [items, filter]);
  const delivered = items.filter((item) => ["Delivered", "Posted"].includes(item.status)).length;
  const grouped = useMemo(() => { const groups = new Map<string, Item[]>(); visibleItems.forEach((item) => { const key = item.dateKey || "Unscheduled"; groups.set(key, [...(groups.get(key) ?? []), item]); }); return [...groups.entries()]; }, [visibleItems]);

  if (loading) return <main className="shell loading-screen"><div className="loader-mark">l</div><p>Loading your calendar…</p></main>;
  if (error || !data?.client) return <main className="shell empty-screen"><div className="brand-lockup"><span className="brand-mark">l</span><span>layaa</span></div><h1>Private calendar link</h1><p>{error || "This invite is not available."}</p><span className="help-note">Please ask the Layaa team for a fresh invite link.</span></main>;

  const client = data.client;
  const target = Math.max(0, client.target || 0);
  const progress = target ? Math.min(100, Math.round((delivered / target) * 100)) : 0;

  return <main className="shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark">l</span><span>layaa</span></div><span className="portal-label">CLIENT PORTAL</span><span className="secure-label"><span className="secure-dot" /> Private view</span></header>
    <section className="hero" style={{ "--client-color": client.color || "#2f6a61" } as React.CSSProperties}><div><p className="eyebrow">CONTENT CALENDAR · {client.kind.toUpperCase()}</p><h1>{client.name}</h1><p className="hero-sub">Your content plan, progress, and delivery links in one place.</p></div><div className="hero-meta"><span>{client.split || "Monthly content plan"}</span>{client.finalContentLink ? <a href={client.finalContentLink} target="_blank" rel="noreferrer">Final Drive folder ↗</a> : null}</div></section>
    <section className="stats-grid" aria-label="Calendar summary"><article><span className="stat-label">This month</span><strong>{items.length}</strong><span className="stat-note">planned items</span></article><article><span className="stat-label">Delivered</span><strong>{delivered}</strong><span className="stat-note">of {target || "—"} target</span></article><article><span className="stat-label">Progress</span><strong>{progress}%</strong><div className="progress"><span style={{ width: `${progress}%` }} /></div></article></section>
    <section className="calendar-panel"><div className="section-head"><div><p className="eyebrow">WORK PLAN</p><h2>Content calendar</h2></div><span className="item-count">{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</span></div><div className="filter-row" role="tablist" aria-label="Filter content status">{statuses.map((status) => <button key={status} className={filter === status ? "filter active" : "filter"} onClick={() => setFilter(status)}>{status}</button>)}</div>{grouped.length ? <div className="timeline">{grouped.map(([date, dateItems]) => <div className="day-group" key={date}><div className="day-label"><span className="day-dot" />{date}</div><div className="day-items">{dateItems.map((item) => <article className="content-card" key={item.id}><div className="card-main"><div className="type-chip">{item.type}</div><h3>{item.title}</h3>{item.owner ? <p className="owner">Assigned to {item.owner}</p> : null}{item.notes ? <p className="notes">{item.notes}</p> : null}</div><div className="card-actions"><span className={`status ${statusClass(item.status)}`}>{item.status}</span>{item.rawLink ? <a href={item.rawLink} target="_blank" rel="noreferrer">Raw Drive ↗</a> : null}{item.finalLink ? <a href={item.finalLink} target="_blank" rel="noreferrer">Final Drive ↗</a> : null}</div></article>)}</div></div>)}</div> : <div className="empty-calendar"><span>✓</span><h3>No items in this view</h3><p>Try another status filter or check back after the next update.</p></div>}</section>
    <footer><span>Prepared by Layaa</span><span>Questions or changes? Contact your Layaa team.</span></footer>
  </main>;
}
