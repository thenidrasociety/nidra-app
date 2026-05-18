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

// ── Context ───────────────────────────────────────────────────────────────────
export interface BabyProfile { id: string; name: string; }
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
  config: { babies: [{ id: "b1", name: "Mi bebé" }], familyMode: false, activeBabyId: "b1" },
  setConfig: () => {},
  user: null,
});

export const useAppConfig = () => useContext(AppContext);

// ── Chat ──────────────────────────────────────────────────────────────────────
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
  const [baby1Name, setBaby1Name] = useState(config.babies[0]?.name ?? "");
  const [baby2Name, setBaby2Name] = useState(config.babies[1]?.name ?? "");
  const [familyMode, setFamilyMode] = useState(config.familyMode);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const babies: BabyProfile[] = [{ id: "b1", name: baby1Name || "Mi bebé" }];
    if (familyMode) babies.push({ id: "b2", name: baby2Name || "Bebé 2" });
    const newConfig = { babies, familyMode, activeBabyId: config.activeBabyId };
    setConfig(newConfig);

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        baby1_name: baby1Name || "Mi bebé",
        baby2_name: familyMode ? (baby2Name || "Bebé 2") : null,
        family_mode: familyMode,
      });
    }
    setSaving(false);
    onClose();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 430, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: C.teal }}>Perfiles</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>

        {user && (
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, padding: "8px 12px", background: C.cream, borderRadius: 8 }}>
            {user.email}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.olive, marginBottom: 6 }}>Nombre del bebé</div>
          <input value={baby1Name} onChange={e => setBaby1Name(e.target.value)} placeholder="Ej: Sofía"
            style={{ width: "100%", border: `1.5px solid ${C.sage}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444", background: C.cream, outline: "none", boxSizing: "border-box" }} />
        </div>

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

        {familyMode && (
          <>
            <div style={{ background: "#fdf8f2", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#8a6020", lineHeight: 1.5 }}>
              💛 El modo familiar está disponible para suscriptores del plan Familiar.
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.olive, marginBottom: 6 }}>Nombre del segundo bebé</div>
              <input value={baby2Name} onChange={e => setBaby2Name(e.target.value)} placeholder="Ej: Mateo"
                style={{ width: "100%", border: `1.5px solid ${C.sage}`, borderRadius: 8, padding: "9px 12px", fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444", background: C.cream, outline: "none", boxSizing: "border-box" }} />
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

// ── Baby Selector ─────────────────────────────────────────────────────────────
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

// ── Chat ──────────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hola, soy Nidra 🌙 Tu asistente de sueño. ¿En qué puedo ayudarte hoy? Cuéntame cómo están las noches." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

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
          system: SYSTEM_PROMPT,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        }),
      });
      const data = await res.json();
      setMessages([...updated, { role: "assistant", content: data?.content?.[0]?.text ?? "Lo siento, tuve un problema 🙏" }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "Error de conexión. Intenta de nuevo 💙" }]);
    }
    setLoading(false);
  };

  const quickPrompts = ["¿A qué hora debería dormir?", "Mi bebé no duerme de noche", "¿Cuántas siestas necesita?", "¿Cómo manejo una regresión?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 145px)" }}>
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("tracker");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [config, setConfig] = useState<AppConfig>({
    babies: [{ id: "b1", name: "Mi bebé" }],
    familyMode: false,
    activeBabyId: "b1",
  });

  // Auth listener
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

  // Load profile from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        const babies: BabyProfile[] = [{ id: "b1", name: data.baby1_name || "Mi bebé" }];
        if (data.family_mode && data.baby2_name) babies.push({ id: "b2", name: data.baby2_name });
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

  // Save log to Supabase
  const addLog = async (newLogs: LogEntry[]) => {
    setLogs(newLogs);
    if (!user) return;
    if (!Array.isArray(newLogs) || newLogs.length === 0) return;
    // The newest log is the one with the highest id
    let newest: LogEntry | undefined;
    for (const log of newLogs) {
      if (!newest || log.id > newest.id) newest = log;
    }
    if (!newest || !newest.babyId) return;
    const { error } = await supabase.from("sleep_logs").insert({
      user_id: user.id,
      baby_id: newest.babyId,
      type: newest.type,
      start_time: newest.startTime,
      end_time: newest.endTime || null,
      notes: newest.notes || null,
      duration: newest.duration || null,
      date: newest.date,
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
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12 }}>🌙</span>
            <span style={{ fontSize: 12, color: "#fff" }}>{activeBaby.name}</span>
          </div>
        </div>

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
          {tab === "schedule"  && <ScheduleTab />}
          {tab === "analytics" && <AnalyticsTab logs={activeLogs} babyName={activeBaby.name} />}
          {tab === "goals"     && <GoalsTab />}
          {tab === "chat"      && <ChatTab />}
        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </AppContext.Provider>
  );
}
