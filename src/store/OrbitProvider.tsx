// OrbitProvider — global app state via React context. Mirrors the prototype's
// store.jsx: auth/session, tickets, AI recs, per-ticket comments/messages/
// progress, the shared ballot store (board votes appear live in operator
// Ticket Command), theme, and toasts. The action surface is the seam the
// future tRPC client will implement.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AiRec,
  Channel,
  ChatMessage,
  ChecklistItem,
  CommAudience,
  CommChannel,
  CommVia,
  OrbitUser,
  Ticket,
  TicketComment,
  TicketMessage,
} from "@/lib/types";
import { stamp } from "@/lib/format";
import { addDaysISO, todayISO } from "@/lib/focus";
import { AI_RECS, PEOPLE, TICKETS } from "@/data/seed";
import { ticketFlow } from "@/data/flow";
import { deriveWorkOrder, seedWorkOrders, type Invoice, type WorkOrder, type WoStageKey } from "@/data/workorders";
import { WO_STAGES } from "@/data/workorders";
import { SEED_NOTICES, type Notice } from "@/data/notices";
import { userById, userName } from "@/data/identity";

// a few do-dates so the Focus board has content on first load
const SEED_WORK_DATES: Record<string, string> = {
  "T-4801": todayISO(), "T-4795": todayISO(), "T-4779": addDaysISO(1), "T-4790": addDaysISO(2),
};

export type ThemeName = "dark" | "light" | "clear";
export type Route = { page: string; id: string | null };
export type Toast = { msg: string; kind: "ok" | "err"; t: number } | null;

let _tid = 4802;
const nextTicketId = () => "T-" + _tid++;

interface OrbitState {
  // routing + auth
  route: Route;
  nav: (page: string, id?: string | null) => void;
  currentUser: OrbitUser | null;
  role: string;
  login: (id: string) => void;
  logout: () => void;
  // theme
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  // tickets
  tickets: Ticket[];
  createTicket: (data: Partial<Ticket> & Pick<Ticket, "title" | "building" | "type" | "prio" | "requester">) => string;
  assignTicket: (id: string, who: string) => void;
  setTicketStatus: (id: string, status: Ticket["status"]) => void;
  addTicketNote: (id: string, text: string) => void;
  updateTicket: (id: string, patch: Partial<Ticket>, note?: string) => void;
  /** set the operator's personal "do date" (ClickUp-style), or null to clear */
  setWorkDate: (id: string, date: string | null) => void;
  /** bump priority one level (SLA escalation) */
  escalateTicket: (id: string) => void;
  // ticket relationships
  spawnChildTicket: (parentId: string, data: { title: string; type?: Ticket["type"]; prio?: Ticket["prio"] }) => string;
  linkTickets: (aId: string, bId: string) => void;
  mergeTickets: (sourceId: string, targetId: string) => void;
  // the open full-screen Ticket Command workspace (so any view can open one)
  commandId: string | null;
  openCommand: (id: string) => void;
  closeCommand: () => void;
  // communications
  ticketComments: Record<string, TicketComment[]>;
  seedComments: (tid: string, list: TicketComment[]) => void;
  addComment: (tid: string, text: string, mentions?: string[]) => void;
  ticketMessages: Record<string, TicketMessage[]>;
  seedMessages: (tid: string, list: TicketMessage[]) => void;
  sendTicketMessage: (tid: string, payload: { audience: CommAudience; channels: CommChannel[]; text: string }) => void;
  // progress
  ticketProgress: Record<string, { items: ChecklistItem[] }>;
  seedProgress: (tid: string, p: { items: ChecklistItem[] }) => void;
  setProgressItems: (tid: string, items: ChecklistItem[]) => void;
  postProgress: (tid: string, text: string, pct: number) => void;
  // ai
  recs: AiRec[];
  decideRec: (id: string, decision: "approved" | "rejected") => void;
  addRecs: (recs: AiRec[]) => void;
  // notices (building broadcasts)
  notices: Notice[];
  sendNotice: (n: Omit<Notice, "id" | "at"> & { at?: string }) => void;
  // shared ballots
  ballots: Record<string, Record<string, string>>;
  castBallot: (ticketId: string, memberName: string, bidId: string) => void;
  // work orders (vendor ↔ ticket ↔ invoice ↔ payment)
  workOrders: Record<string, WorkOrder>;
  ensureWorkOrder: (t: Ticket) => void;
  setWoStage: (ticketId: string, stage: WoStageKey, note?: string) => void;
  recordInvoice: (ticketId: string, inv: { number: string; amount: number; dueDate: string }) => void;
  setInvoiceStatus: (ticketId: string, status: Invoice["status"]) => void;
  addWoLog: (ticketId: string, text: string) => void;
  // live chat (Communications)
  chat: Record<string, ChatMessage[]>;
  seedChat: (channelId: string, msgs: ChatMessage[]) => void;
  sendChat: (channel: Channel, payload: { via: CommVia; text: string; toAll?: boolean }) => void;
  // toast
  toast: Toast;
  notify: (msg: string, kind?: "ok" | "err") => void;
}

const OrbitCtx = createContext<OrbitState | null>(null);

export function useOrbit(): OrbitState {
  const ctx = useContext(OrbitCtx);
  if (!ctx) throw new Error("useOrbit must be used within OrbitProvider");
  return ctx;
}

export function OrbitProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ page: "dashboard", id: null });
  const [userId, setUserId] = useState<string | null>(() => {
    try { return localStorage.getItem("orbit_user"); } catch { return null; }
  });
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try { return (localStorage.getItem("orbit_theme") as ThemeName) || "dark"; } catch { return "dark"; }
  });
  const [tickets, setTickets] = useState<Ticket[]>(() => TICKETS.map((t) => ({ ...t, workDate: SEED_WORK_DATES[t.id] ?? null })));
  const [recs, setRecs] = useState<AiRec[]>(() => AI_RECS.map((r) => ({ ...r })));
  const [notices, setNotices] = useState<Notice[]>(() => SEED_NOTICES.map((n) => ({ ...n })));
  const [ticketComments, setTicketComments] = useState<Record<string, TicketComment[]>>({});
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [ticketProgress, setTicketProgress] = useState<Record<string, { items: ChecklistItem[] }>>({});
  const [ballots, setBallots] = useState<Record<string, Record<string, string>>>({});
  const [workOrders, setWorkOrders] = useState<Record<string, WorkOrder>>(() => seedWorkOrders(TICKETS, ticketFlow));
  const [chat, setChat] = useState<Record<string, ChatMessage[]>>({});
  const [commandId, setCommandId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const openCommand = useCallback((id: string) => setCommandId(id), []);
  const closeCommand = useCallback(() => setCommandId(null), []);

  const currentUser = userById(userId);
  const role = currentUser && currentUser.persona === "operator" ? "pm" : currentUser?.persona ?? "pm";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try { localStorage.setItem("orbit_theme", t); } catch { /* ignore */ }
  }, []);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const t = Date.now();
    setToast({ msg, kind, t });
    setTimeout(() => setToast((cur) => (cur && Date.now() - cur.t >= 2400 ? null : cur)), 2500);
  }, []);

  const nav = useCallback((page: string, id: string | null = null) => setRoute({ page, id }), []);

  const login = useCallback((id: string) => {
    const u = userById(id);
    if (!u) return;
    try { localStorage.setItem("orbit_user", id); } catch { /* ignore */ }
    setUserId(id);
    setRoute({ page: u.persona === "operator" ? u.home || "dashboard" : "portal", id: null });
    notify("Signed in · " + userName(u));
  }, [notify]);

  const logout = useCallback(() => {
    try { localStorage.removeItem("orbit_user"); } catch { /* ignore */ }
    setUserId(null);
    setRoute({ page: "dashboard", id: null });
  }, []);

  const me = useCallback(() => (currentUser?.persona === "operator" ? currentUser.who! : "nick"), [currentUser]);
  const logLine = (actor: string, text: string): [string, string, string] => [stamp(), actor, text];

  const createTicket = useCallback<OrbitState["createTicket"]>((data) => {
    const id = nextTicketId();
    const t: Ticket = {
      id,
      assignee: null,
      desc: "",
      status: "Open",
      verified: false,
      created: new Date().toISOString(),
      parentId: null,
      linkedIds: [],
      mergedInto: null,
      log: [logLine(me(), "Ticket created")],
      ...data,
    } as Ticket;
    setTickets((ts) => [t, ...ts]);
    notify(id + " created");
    return id;
  }, [me, notify]);

  const assignTicket = useCallback((id: string, who: string) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, assignee: who, status: t.status === "Open" ? "Assigned" : t.status, log: [...t.log, logLine("nick", "Assigned to " + (PEOPLE[who]?.name || who))] } : t));
  }, []);

  const setTicketStatus = useCallback((id: string, status: Ticket["status"]) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, status, verified: status === "Closed" ? true : t.verified, log: [...t.log, logLine("nick", "Status → " + status)] } : t));
  }, []);

  const addTicketNote = useCallback((id: string, text: string) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, log: [...t.log, logLine(me(), text)] } : t));
  }, [me]);

  const updateTicket = useCallback<OrbitState["updateTicket"]>((id, patch, note) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, ...patch, log: note ? [...t.log, logLine(me(), note)] : t.log } : t));
  }, [me]);

  const setWorkDate = useCallback((id: string, date: string | null) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, workDate: date } : t));
  }, []);

  const escalateTicket = useCallback((id: string) => {
    const order: Ticket["prio"][] = ["Low", "Normal", "High", "Critical"];
    let bumped = false;
    setTickets((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const next = order[Math.min(order.length - 1, order.indexOf(t.prio) + 1)];
      if (next === t.prio) return t;
      bumped = true;
      return { ...t, prio: next, log: [...t.log, logLine(me(), "Escalated · priority → " + next + " (SLA at risk)")] };
    }));
    notify(bumped ? "Escalated · owner notified" : "Already at Critical");
  }, [me, notify]);

  const seedComments = useCallback((tid: string, list: TicketComment[]) => {
    setTicketComments((s) => (s[tid] ? s : { ...s, [tid]: list }));
  }, []);
  const addComment = useCallback((tid: string, text: string, mentions: string[] = []) => {
    setTicketComments((s) => ({ ...s, [tid]: [...(s[tid] || []), { id: "c" + Date.now(), by: me(), text, mentions, at: stamp() }] }));
  }, [me]);

  const seedMessages = useCallback((tid: string, list: TicketMessage[]) => {
    setTicketMessages((s) => (s[tid] ? s : { ...s, [tid]: list }));
  }, []);
  const sendTicketMessage = useCallback<OrbitState["sendTicketMessage"]>((tid, payload) => {
    const msg: TicketMessage = { id: "m" + Date.now(), dir: "out", by: me(), at: stamp(), ...payload };
    setTicketMessages((s) => ({ ...s, [tid]: [...(s[tid] || []), msg] }));
    setTickets((ts) => ts.map((t) => t.id === tid ? { ...t, log: [...t.log, logLine(me(), "Update → " + payload.audience + " · " + payload.channels.join(" + "))] } : t));
    notify("Sent to " + payload.audience + " · " + payload.channels.join(" + "));
  }, [me, notify]);

  const seedProgress = useCallback((tid: string, p: { items: ChecklistItem[] }) => {
    setTicketProgress((s) => (s[tid] ? s : { ...s, [tid]: p }));
  }, []);
  const setProgressItems = useCallback((tid: string, items: ChecklistItem[]) => {
    setTicketProgress((s) => ({ ...s, [tid]: { ...(s[tid] || {}), items } }));
  }, []);
  const postProgress = useCallback((tid: string, text: string, pct: number) => {
    setTickets((ts) => ts.map((t) => t.id === tid ? { ...t, log: [...t.log, logLine(me(), "Progress " + pct + "% — " + text)] } : t));
    notify("Progress logged · " + pct + "%");
  }, [me, notify]);

  const decideRec = useCallback((id: string, decision: "approved" | "rejected") => {
    setRecs((rs) => rs.map((r) => r.id === id ? { ...r, status: decision } : r));
    notify("Recommendation " + decision + " · written to chain");
  }, [notify]);

  const addRecs = useCallback((incoming: AiRec[]) => {
    if (!incoming.length) return;
    setRecs((rs) => {
      const ids = new Set(rs.map((r) => r.id));
      const fresh = incoming.filter((r) => !ids.has(r.id));
      return [...fresh, ...rs];
    });
  }, []);

  const sendNotice = useCallback<OrbitState["sendNotice"]>((n) => {
    const at = n.at || (n.status === "Scheduled" ? "Scheduled" : new Date().toISOString().slice(0, 16).replace("T", " "));
    setNotices((ns) => [{ ...n, id: "n" + Date.now(), at }, ...ns]);
    notify(n.status === "Scheduled" ? "Notice scheduled · " + n.reach + " residents" : n.status === "Draft" ? "Draft saved" : "Notice sent to " + n.reach + " residents");
  }, [notify]);

  const castBallot = useCallback((ticketId: string, memberName: string, bidId: string) => {
    setBallots((b) => ({ ...b, [ticketId]: { ...(b[ticketId] || {}), [memberName]: bidId } }));
  }, []);

  // ── work orders ──
  const ensureWorkOrder = useCallback((t: Ticket) => {
    setWorkOrders((wos) => {
      if (wos[t.id]) return wos;
      const f = ticketFlow(t);
      if (!f.awarded) return wos;
      const seq = Object.values(wos).filter((w) => w.buildingId === t.building).length + 1;
      return { ...wos, [t.id]: deriveWorkOrder(t, f, seq) };
    });
  }, []);

  const setWoStage = useCallback((ticketId: string, stage: WoStageKey, note?: string) => {
    const label = WO_STAGES.find((s) => s.key === stage)?.label || stage;
    setWorkOrders((wos) => {
      const w = wos[ticketId];
      if (!w) return wos;
      return { ...wos, [ticketId]: { ...w, stage, log: [...w.log, logLine(me(), note || "Stage → " + label)] } };
    });
    setTickets((ts) => ts.map((t) => t.id === ticketId ? { ...t, log: [...t.log, logLine(me(), "Work order → " + label)] } : t));
  }, [me]);

  const addWoLog = useCallback((ticketId: string, text: string) => {
    setWorkOrders((wos) => { const w = wos[ticketId]; return w ? { ...wos, [ticketId]: { ...w, log: [...w.log, logLine(me(), text)] } } : wos; });
  }, [me]);

  const recordInvoice = useCallback((ticketId: string, inv: { number: string; amount: number; dueDate: string }) => {
    setWorkOrders((wos) => {
      const w = wos[ticketId];
      if (!w) return wos;
      const invoice: Invoice = { number: inv.number, amount: inv.amount, receivedAt: todayISO(), dueDate: inv.dueDate, status: "received" };
      return { ...wos, [ticketId]: { ...w, invoice, stage: "invoiced", log: [...w.log, logLine(me(), "Invoice " + inv.number + " received · $" + inv.amount.toLocaleString())] } };
    });
    notify("Invoice " + inv.number + " logged");
  }, [me, notify]);

  const setInvoiceStatus = useCallback((ticketId: string, status: Invoice["status"]) => {
    setWorkOrders((wos) => {
      const w = wos[ticketId];
      if (!w || !w.invoice) return wos;
      const stage: WoStageKey = status === "paid" ? "paid" : w.stage;
      const txt = status === "approved" ? "Invoice " + w.invoice.number + " approved for payment" : status === "paid" ? "Payment released · " + w.invoice.number + " marked paid" : "Invoice updated";
      return { ...wos, [ticketId]: { ...w, stage, invoice: { ...w.invoice, status }, log: [...w.log, logLine(me(), txt)] } };
    });
    notify(status === "paid" ? "Marked paid" : status === "approved" ? "Invoice approved" : "Updated");
  }, [me, notify]);

  // ── ticket relationships ──
  const spawnChildTicket = useCallback<OrbitState["spawnChildTicket"]>((parentId, data) => {
    const parent = TICKETS.concat([]).find((x) => x.id === parentId);
    const id = nextTicketId();
    let buildingId = parent?.building;
    setTickets((ts) => {
      const p = ts.find((x) => x.id === parentId);
      buildingId = p?.building || buildingId || "b1";
      const child: Ticket = {
        id, title: data.title, building: buildingId, type: data.type || p?.type || "Maintenance",
        prio: data.prio || p?.prio || "Normal", status: "Open", assignee: null, requester: "Subtask · " + parentId,
        created: new Date().toISOString(), desc: "", verified: false, parentId, linkedIds: [], mergedInto: null,
        log: [logLine(me(), "Spawned from " + parentId)],
      };
      const withParentNote = ts.map((x) => x.id === parentId ? { ...x, log: [...x.log, logLine(me(), "Subtask → " + id + " · " + data.title)] } : x);
      return [child, ...withParentNote];
    });
    notify(id + " created from " + parentId);
    return id;
  }, [me, notify]);

  const linkTickets = useCallback((aId: string, bId: string) => {
    setTickets((ts) => ts.map((t) => {
      if (t.id === aId) return { ...t, linkedIds: [...new Set([...(t.linkedIds || []), bId])], log: [...t.log, logLine(me(), "Linked to " + bId)] };
      if (t.id === bId) return { ...t, linkedIds: [...new Set([...(t.linkedIds || []), aId])] };
      return t;
    }));
    notify(aId + " ⇄ " + bId + " linked");
  }, [me, notify]);

  const mergeTickets = useCallback((sourceId: string, targetId: string) => {
    setTickets((ts) => ts.map((t) => {
      if (t.id === sourceId) return { ...t, mergedInto: targetId, status: "Closed", verified: true, log: [...t.log, logLine(me(), "Merged into " + targetId + " as duplicate")] };
      if (t.id === targetId) return { ...t, linkedIds: [...new Set([...(t.linkedIds || []), sourceId])], log: [...t.log, logLine(me(), "Absorbed duplicate " + sourceId)] };
      return t;
    }));
    notify(sourceId + " merged into " + targetId);
  }, [me, notify]);

  // ── live chat ──
  const seedChat = useCallback((channelId: string, msgs: ChatMessage[]) => {
    setChat((s) => (s[channelId] ? s : { ...s, [channelId]: msgs }));
  }, []);

  const sendChat = useCallback<OrbitState["sendChat"]>((channel, payload) => {
    const msg: ChatMessage = { id: "m" + Date.now(), channelId: channel.id, senderId: "me", via: payload.via, text: payload.text, at: stamp(), toAll: payload.toAll };
    setChat((s) => ({ ...s, [channel.id]: [...(s[channel.id] || []), msg] }));
    if (channel.ticketId) {
      setTickets((ts) => ts.map((t) => t.id === channel.ticketId ? { ...t, log: [...t.log, logLine(me(), "Message → " + channel.title + " · " + payload.via)] } : t));
    }
    // light simulated reply so the surface feels alive
    const repliers = channel.participants;
    if (repliers.length) {
      const who = repliers[Math.floor(Math.random() * repliers.length)];
      const acks = channel.kind === "board"
        ? ["Noted, thanks.", "Sounds good.", "Agreed — keep us posted.", "👍 on the award."]
        : channel.kind === "vendor"
          ? ["Copy that.", "On it — will confirm.", "Received, thanks."]
          : ["Thank you!", "Got it, appreciate the update.", "Okay, sounds good.", "Thanks — I'll be around."];
      const ack = acks[Math.floor(Math.random() * acks.length)];
      window.setTimeout(() => {
        setChat((s) => ({ ...s, [channel.id]: [...(s[channel.id] || []), { id: "r" + Date.now(), channelId: channel.id, senderId: who.id, via: payload.via, text: ack, at: stamp() }] }));
      }, 1400);
    }
  }, [me]);

  const value = useMemo<OrbitState>(() => ({
    route, nav, currentUser, role, login, logout,
    theme, setTheme,
    tickets, createTicket, assignTicket, setTicketStatus, addTicketNote, updateTicket, setWorkDate, escalateTicket,
    spawnChildTicket, linkTickets, mergeTickets,
    commandId, openCommand, closeCommand,
    ticketComments, seedComments, addComment,
    ticketMessages, seedMessages, sendTicketMessage,
    ticketProgress, seedProgress, setProgressItems, postProgress,
    recs, decideRec, addRecs,
    notices, sendNotice,
    ballots, castBallot,
    workOrders, ensureWorkOrder, setWoStage, recordInvoice, setInvoiceStatus, addWoLog,
    chat, seedChat, sendChat,
    toast, notify,
  }), [route, nav, currentUser, role, login, logout, theme, setTheme, tickets, createTicket, assignTicket, setTicketStatus, addTicketNote, updateTicket, setWorkDate, escalateTicket, spawnChildTicket, linkTickets, mergeTickets, ticketComments, seedComments, addComment, ticketMessages, seedMessages, sendTicketMessage, ticketProgress, seedProgress, setProgressItems, postProgress, recs, decideRec, addRecs, notices, sendNotice, ballots, castBallot, workOrders, ensureWorkOrder, setWoStage, recordInvoice, setInvoiceStatus, addWoLog, chat, seedChat, sendChat, commandId, openCommand, closeCommand, toast, notify]);

  return <OrbitCtx.Provider value={value}>{children}</OrbitCtx.Provider>;
}
