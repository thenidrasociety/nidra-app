import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { supabase } from "./supabase";
import AuthScreen from "./components/AuthScreen";
import SleepTracker, { LogEntry } from "./components/SleepTracker";
import AnalyticsTab from "./components/AnalyticsTab";
import ScheduleTab from "./components/ScheduleTab";
import GoalsTab from "./components/GoalsTab";
import { User } from "@supabase/supabase-js";

const C = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  lavender: "#C4C3CC",
  cream: "#EBE7E0",
};

// ── Baby age helpers ──────────────────────────────────────────────────────────
export function getAgeInMonths(birthdate: string): number {
  if (!birthdate) return 0;
  const birth = new Date(birthdate);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
}

export function getAgeLabel(birthdate: string): string {
  const months = getAgeInMonths(birthdate);
  if (months < 1) return "Recién nacido";
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} ${years === 1 ? "año" : "años"}`;
  return `${years}a ${rem}m`;
}

export function getAgeIdxFromMonths(months: number): number {
  if (months <= 3)  return 0; // 0-3m
  if (months <= 4)  return 1; // 3-4m
  if (months <= 6)  return 2; // 5-6m
  if (months <= 8)  return 3; // 7-8m
  if (months <= 12) return 4; // 9-12m
  if (months <= 17) return 5; // 13-17m
  if (months <= 36) return 6; // 18m-3a
  if (months <= 48) return 7; // 3-4a
  return 8;                   // 4-5a
}

export function getNapTransitionAlert(months: number): string | null {
  if (months >= 15 && months <= 18) return "Tu bebé se acerca a la transición de 2 a 1 siesta (entre los 15–18 meses). Ve preparándote.";
  if (months >= 6 && months <= 8)   return "Tu bebé puede estar listo para pasar de 3 a 2 siestas (entre los 7–8 meses).";
  if (months >= 3 && months <= 5)   return "Entre los 4–6 meses muchos bebés pasan de 4 a 3 siestas. Observa las señales.";
  if (months >= 36 && months <= 48) return "Entre los 3–4 años algunos bebés abandonan la siesta. Es normal si duerme bien de noche.";
  return null;
}

// ── Context ───────────────────────────────────────────────────────────────────
export interface BabyProfile {
  id: string;
  name: string;
  birthdate: string;
}

export interface AppConfig {
  babies: BabyProfile[];
  familyMode: boolean;
  activeBabyId: string;
}

export const AppContext = createContext<{
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  user: User | null;
}>({
  config: { babies: [{ id: "b1", name: "Mi bebé", birthdate: "" }], familyMode: false, activeBabyId: "b1" },
  setConfig: () => {},
  user: null,
});

export const useAppConfig = () => useContext(AppContext);

// ── Chat system prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un asistente de apoyo de The Nidra Society, la marca de Adri, consultora de sueño infantil y coach de crianza consciente certificada internacionalmente.
Tu nombre es Nidra y respondes en español con calidez, empatía y conocimiento experto.
Nunca recomiendas métodos que hagan sufrir al bebé o a los padres.
Siempre validas primero el estado emocional de la mamá o papá antes de dar consejos.
Mantienes respuestas cortas (máximo 3-4 oraciones) a menos que se pida más detalle.
Lema: Sueño consciente, familias prósperas.`;

interface Message { role: "user" | "assistant"; content: string; }
type Tab = "tracker" | "schedule" | "analytics" | "goals" | "chat";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "tracker",   label: "Registro",  icon: "🌙" },
  { id: "schedule",  label: "Horario",   icon: "📅" },
  { id: "analytics", label: "Análisis",  icon: "📊" },
  { id: "goals",     label: "Mi plan",   icon: "✨" },
  { id: "chat",      label: "Nidra",     icon: "💬" },
];

// ── Profile Modal ─────────────────────────────────────────────────────────────
function ProfileModal({ onClose }: { onClose: () => void }) {
  const { config, setConfig, user } = useAppConfig();
  const [baby1Name, setBaby1Name]           = useState(config.babies[0]?.name ?? "");
  const [baby1Birthdate, setBaby1Birthdate] = useState(config.babies[0]?.birthdate ?? "");
  const [baby2Name, setBaby2Name]           = useState(config.babies[1]?.name ?? "");
  const [baby2Birthdate, setBaby2Birthdate] = useState(config.babies[1]?.birthdate ?? "");
  const [familyMode, setFamilyMode]         = useState(config.familyMode);
  const [saving, setSaving]                 = useState(false);

  const save = async () => {
    setSaving(true);
    const babies: BabyProfile[] = [{ id: "b1", name: baby1Name || "Mi bebé", birthdate: baby1Birthdate }];
    if (familyMode) babies.push({ id: "b2", name: baby2Name || "Bebé 2", birthdate: baby2Birthdate });
    const newConfig = { babies, familyMode, activeBabyId: config.activeBabyId };
    setConfig(newConfig);
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id, email: user.email,
        baby1_name: baby1Name || "Mi bebé",
        baby1_birthdate: baby1Birthdate || null,
        baby2_name: familyMode ? (baby2Name || "Bebé 2") : null,
        baby2_birthdate: familyMode ? (baby2Birthdate || null) : null,
        family_mode: familyMode,
      });
    }
    setSaving(false);
    onClose();
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: `1.5px solid ${C.sage}`, borderRadius: 8,
    padding: "9px 12px", fontFamily: "'Niramit', sans-serif", fontSize: 14,
    color: "#444", background: C.cream, outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: C.olive, marginBottom: 6, display: "block",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 430, margin: "0 auto", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: C.teal }}>Perfiles</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>

        {user && (
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, padding: "8px 12px", background: C.cream, borderRadius: 8 }}>
            {user.email}
          </div>
        )}

        {/* Baby 1 */}
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Nombre del bebé</label>
          <input value={baby1Name} onChange={e => setBaby1Name(e.target.value)} placeholder="Ej: Sofía" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Fecha de nacimiento</label>
          <input type="date" value={baby1Birthdate} onChange={e => setBaby1Birthdate(e.target.value)} style={inputStyle} />
          {baby1Birthdate && (
            <div style={{ fontSize: 11, color: C.teal, marginTop: 4 }}>
              Edad: {getAgeLabel(baby1Birthdate)}
            </div>
          )}
        </div>

        {/* Family mode */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.cream, borderRadius: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.teal }}>Modo familiar 👨‍👩‍👧‍👦</div>
            <div style={{ fontSize: 11, color: C.olive, marginTop: 2 }}>Gemelos o dos bebés — +$2/mes</div>
          </div>
          <div onClick={() => setFamilyMode(!familyMode)}
            style={{ width: 44, height: 24, borderRadius: 12, background: familyMode ? C.teal : "#ddd", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: familyMode ? 22 : 2, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
          </div>
        </div>

        {/* Baby 2 */}
        {familyMode && (
          <>
            <div style={{ background: "#fdf8f2", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#8a6020", lineHeight: 1.5 }}>
              💛 El modo familiar está disponible para suscriptores del plan Familiar.
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Nombre del segundo bebé</label>
              <input value={baby2Name} onChange={e => setBaby2Name(e.target.value)} placeholder="Ej: Mateo" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fecha de nacimiento</label>
              <input type="date" value={baby2Birthdate} onChange={e => setBaby2Birthdate(e.target.value)} style={inputStyle} />
              {baby2Birthdate && (
                <div style={{ fontSize: 11, color: C.teal, marginTop: 4 }}>
                  Edad: {getAgeLabel(baby2Birthdate)}
                </div>
              )}
            </div>
          </>
        )}

        <button onClick={save} disabled={saving}
          style={{ width: "100%", padding: 13, background: C.teal, color: "#fff", border: "none", borderRadius: 12, fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 12, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Guardando···" : "Guardar"}
        </button>
        <button onClick={signOut}
          style={{ width: "100%", padding: 11, background: "transparent", color: "#aaa", border: "0.5px solid #ddd", borderRadius: 12, fontFamily: "'Niramit', sans-serif", fontSize: 13, cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Baby Selector Bar ─────────────────────────────────────────────────────────
export function BabySelectorBar() {
  const { config, setConfig } = useAppConfig();
  if (!config.familyMode || config.babies.length < 2) return null;
  return (
    <div style={{ display: "flex", background: C.cream, padding: "6px 16px", gap: 8 }}>
      {config.babies.map(baby => (
        <button key={baby.id} onClick={() => setConfig({ ...config, activeBabyId: baby.id })}
          style={{ flex: 1, padding: "7px 8px", border: `1px solid ${config.activeBabyId === baby.id ? C.teal : "transparent"}`, borderRadius: 20, background: config.activeBabyId === baby.id ? C.teal : "#fff", color: config.activeBabyId === baby.id ? "#fff" : C.teal, fontFamily: "'Niramit', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          🌙 {baby.name}
        </button>
      ))}
    </div>
  );
}

// ── Chat History Types ────────────────────────────────────────────────────────
interface ChatSession {
  id: string;
  date: string;
  preview: string;
  messages: Message[];
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab() {
  const { config } = useAppConfig();
  const activeBaby = config.babies.find(b => b.id === config.activeBabyId) ?? config.babies[0];
  const ageInfo = activeBaby.birthdate ? ` El bebé se llama ${activeBaby.name} y tiene ${getAgeLabel(activeBaby.birthdate)}.` : "";

  const INITIAL_MSG: Message = { role: "assistant", content: "Hola, soy Nidra 🌙 Tu asistente de sueño. ¿En qué puedo ayudarte hoy? Cuéntame cómo están las noches." };

  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("nidra_chat_history") || "[]"); } catch { return []; }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(Date.now().toString());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const saveSession = (msgs: Message[], sessionId: string) => {
    if (msgs.length <= 1) return; // Don't save empty sessions
    const userMsgs = msgs.filter(m => m.role === "user");
    if (userMsgs.length === 0) return;
    const preview = userMsgs[0].content.slice(0, 60) + (userMsgs[0].content.length > 60 ? "…" : "");
    const session: ChatSession = {
      id: sessionId,
      date: new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      preview,
      messages: msgs,
    };
    setChatHistory(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      const updated = [session, ...filtered].slice(0, 15);
      try { localStorage.setItem("nidra_chat_history", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const startNewChat = () => {
    saveSession(messages, currentSessionId);
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([INITIAL_MSG]);
    setInput("");
    setShowHistory(false);
  };

  const loadSession = (session: ChatSession) => {
    saveSession(messages, currentSessionId);
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistory(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT + ageInfo,
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const finalMsgs = [...updated, { role: "assistant" as const, content: data?.content?.[0]?.text ?? "Lo siento, tuve un problema 🙏" }];
      setMessages(finalMsgs);
      saveSession(finalMsgs, currentSessionId);
    } catch {
      setMessages([...updated, { role: "assistant", content: "Error de conexión. Intenta de nuevo 💙" }]);
    }
    setLoading(false);
  };

  const quickPrompts = ["¿A qué hora debería dormir?", "Mi bebé no duerme de noche", "¿Cuántas siestas necesita?", "¿Cómo manejo una regresión?"];

  // ── History View ─────────────────────────────────────────────────────────────
  if (showHistory) return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 145px)" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.cream}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
        <button onClick={() => setShowHistory(false)}
          style={{ background: "none", border: "none", fontSize: 13, color: C.teal, cursor: "pointer", fontFamily: "'Niramit', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
          ← Volver al chat
        </button>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 16, color: C.teal }}>Conversaciones</div>
        <div style={{ width: 80 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        <button onClick={startNewChat}
          style={{ width: "100%", padding: "11px 14px", background: C.teal, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Niramit', sans-serif", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          ✦ Nueva conversación
        </button>
        {chatHistory.length === 0 ? (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: 13, padding: "30px 0" }}>
            Aún no tienes conversaciones guardadas
          </div>
        ) : chatHistory.map(session => (
          <div key={session.id} onClick={() => loadSession(session)}
            style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", boxShadow: "0 1px 6px rgba(100,125,131,0.08)", border: `0.5px solid ${session.id === currentSessionId ? C.teal : C.cream}` }}>
            <div style={{ fontSize: 13, color: "#444", marginBottom: 4, fontWeight: session.id === currentSessionId ? 600 : 400 }}>
              {session.id === currentSessionId && <span style={{ color: C.teal }}>● </span>}
              {session.preview}
            </div>
            <div style={{ fontSize: 11, color: "#bbb" }}>📅 {session.date} · {session.messages.filter(m => m.role === "user").length} mensajes</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Chat View ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 145px)" }}>
      {/* Chat toolbar */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.cream}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setShowHistory(true)}
          style={{ background: "none", border: `0.5px solid ${C.sage}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: C.teal, cursor: "pointer", fontFamily: "'Niramit', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
          💬 {chatHistory.length > 0 ? `Historial (${chatHistory.length})` : "Historial"}
        </button>
        <button onClick={startNewChat}
          style={{ background: "none", border: `0.5px solid ${C.sage}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: C.olive, cursor: "pointer", fontFamily: "'Niramit', sans-serif" }}>
          ＋ Nueva conversación
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ background: m.role === "user" ? C.teal : "#fff", color: m.role === "user" ? "#fff" : "#444", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", maxWidth: "80%", fontSize: 13.5, lineHeight: 1.6, marginBottom: 8, alignSelf: m.role === "user" ? "flex-end" : "flex-start", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
            {m.role === "assistant" && <div style={{ fontSize: 10, color: C.olive, fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>NIDRA ✦</div>}
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ background: "#fff", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", maxWidth: "80%", marginBottom: 8, alignSelf: "flex-start", opacity: 0.6 }}>
            <div style={{ fontSize: 10, color: C.olive, fontWeight: 600, marginBottom: 4 }}>NIDRA ✦</div>
            <span style={{ letterSpacing: 4, color: "#aaa" }}>···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, overflowX: "auto" }}>
        {quickPrompts.map(q => (
          <button key={q} onClick={() => setInput(q)}
            style={{ background: C.cream, border: `1px solid ${C.sage}`, borderRadius: 16, padding: "6px 12px", fontSize: 11, color: C.teal, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Niramit', sans-serif", flexShrink: 0 }}>
            {q}
          </button>
        ))}
      </div>
      <div style={{ padding: "8px 16px 24px", background: "#fff", borderTop: `1px solid ${C.cream}`, display: "flex", gap: 10 }}>
        <input style={{ flex: 1, border: `1.5px solid ${C.sage}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444", background: C.cream, outline: "none" }}
          placeholder="Escríbeme…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
        <button onClick={send} disabled={loading}
          style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontFamily: "'Niramit', sans-serif", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>↑</button>
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function NidraApp() {
  const [user, setUser]           = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab]             = useState<Tab>("tracker");
  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [config, setConfig]       = useState<AppConfig>({
    babies: [{ id: "b1", name: "Mi bebé", birthdate: "" }],
    familyMode: false,
    activeBabyId: "b1",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      // Ensure profile row exists WITHOUT overwriting existing data
      const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).single();
      if (!existing) {
        await supabase.from("profiles").insert({ id: user.id, email: user.email });
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        const babies: BabyProfile[] = [{ id: "b1", name: data.baby1_name || "Mi bebé", birthdate: data.baby1_birthdate || "" }];
        if (data.family_mode && data.baby2_name) babies.push({ id: "b2", name: data.baby2_name, birthdate: data.baby2_birthdate || "" });
        setConfig({ babies, familyMode: data.family_mode || false, activeBabyId: "b1" });
      }
    };
    const loadLogs = async () => {
      const { data } = await supabase.from("sleep_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) {
        setLogs(data.map(l => ({
          id: l.id, babyId: l.baby_id, type: l.type,
          startTime: l.start_time, endTime: l.end_time || "",
          notes: l.notes || "", duration: l.duration, date: l.date,
        })));
      }
    };
    loadProfile();
    loadLogs();
  }, [user]);

  const addLog = async (newLogs: LogEntry[]) => {
    setLogs(newLogs);
    if (!user) return;
    if (!Array.isArray(newLogs) || newLogs.length === 0) return;
    let newest: LogEntry | undefined;
    for (const log of newLogs) { if (!newest || log.id > newest.id) newest = log; }
    if (!newest || !newest.babyId) return;
    const { error } = await supabase.from("sleep_logs").insert({
      user_id: user.id, baby_id: newest.babyId, type: newest.type,
      start_time: newest.startTime, end_time: newest.endTime || null,
      notes: newest.notes || null, duration: newest.duration || null, date: newest.date,
    });
    if (error) console.error("Supabase insert error:", error);
  };

  if (authLoading) return (
    <div style={{ fontFamily: "'Niramit', sans-serif", background: C.cream, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
        <div style={{ color: C.teal, fontSize: 14 }}>Cargando···</div>
      </div>
    </div>
  );

  if (!user) return <AuthScreen />;

  const activeBaby = config.babies.find(b => b.id === config.activeBabyId) ?? config.babies[0];
  const activeLogs = logs.filter(l => l.babyId === config.activeBabyId);
  const ageMonths  = getAgeInMonths(activeBaby.birthdate);
  const ageIdx     = getAgeIdxFromMonths(ageMonths);
  const transitionAlert = activeBaby.birthdate ? getNapTransitionAlert(ageMonths) : null;

  return (
    <AppContext.Provider value={{ config, setConfig, user }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Niramit:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #EBE7E0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #C3CFCA; border-radius: 4px; }
        textarea, input { -webkit-appearance: none; }
      `}</style>

      <div style={{ fontFamily: "'Niramit', sans-serif", background: C.cream, minHeight: "100vh", maxWidth: 430, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(160deg, ${C.teal} 0%, ${C.olive} 100%)`, padding: "24px 20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 24, color: "#fff", letterSpacing: 0.5 }}>The Nidra Society</div>
              <div style={{ fontWeight: 300, fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>Sueño consciente · Familias prósperas</div>
            </div>
            <button onClick={() => setShowProfile(true)}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18 }}>👤</span>
            </button>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12 }}>🌙</span>
              <span style={{ fontSize: 12, color: "#fff" }}>{activeBaby.name}</span>
              {activeBaby.birthdate && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>· {getAgeLabel(activeBaby.birthdate)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Transition alert */}
        {transitionAlert && (
          <div style={{ background: "#fdf8f2", borderLeft: `3px solid #C4A882`, padding: "10px 16px", fontSize: 12, color: "#8a6020", lineHeight: 1.5 }}>
            💡 {transitionAlert}
          </div>
        )}

        <BabySelectorBar />

        {/* Nav */}
        <div style={{ display: "flex", background: "#fff", borderBottom: `1px solid ${C.cream}`, position: "sticky", top: 0, zIndex: 10 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "10px 2px", border: "none", background: tab === t.id ? C.cream : "#fff", color: tab === t.id ? C.teal : "#bbb", fontFamily: "'Niramit', sans-serif", fontSize: 10, fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", borderBottom: tab === t.id ? `2px solid ${C.teal}` : "2px solid transparent", transition: "all 0.2s" }}>
              <div style={{ fontSize: 17, marginBottom: 2 }}>{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", height: "calc(100vh - 145px)" }}>
          {tab === "tracker"   && <SleepTracker logs={activeLogs} setLogs={addLog} activeBabyId={config.activeBabyId} babyName={activeBaby.name} />}
          {tab === "schedule"  && <ScheduleTab initialAgeIdx={ageIdx} />}
          {tab === "analytics" && <AnalyticsTab logs={activeLogs} babyName={activeBaby.name} />}
          {tab === "goals"     && <GoalsTab babyName={activeBaby.name} babyAgeMonths={ageMonths} babyBirthdate={activeBaby.birthdate} />}
          {tab === "chat"      && <ChatTab />}
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </AppContext.Provider>
  );
}
