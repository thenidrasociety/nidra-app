import React, { useState } from "react";

export interface LogEntry {
  id: number;
  babyId: string;
  type: "sleep" | "nap" | "feed";
  startTime: string;
  endTime: string;
  notes: string;
  duration: string | null;
  date: string;
}

const COLORS = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  lavender: "#C4C3CC",
  cream: "#EBE7E0",
};

const TYPE_CONFIG = {
  sleep: { label: "Sueño nocturno", color: COLORS.teal,     icon: "🌙" },
  nap:   { label: "Siesta",         color: COLORS.olive,    icon: "😴" },
  feed:  { label: "Alimentación",   color: COLORS.lavender, icon: "🍼" },
};

const getNow = () => new Date().toTimeString().slice(0, 5);

const fmtTime = (t: string) => {
  if (!t) return "–";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};

const diffMin = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
};

interface Props {
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  activeBabyId: string;
  babyName: string;
}

export default function SleepTracker({ logs, setLogs, activeBabyId, babyName }: Props) {
  const [form, setForm] = useState({
    type: "sleep" as "sleep" | "nap" | "feed",
    startTime: getNow(),
    endTime: "",
    notes: "",
  });
  const [adding, setAdding] = useState(false);

  const addLog = () => {
    if (!form.startTime) return;
    const duration =
      form.endTime && form.type !== "feed"
        ? `${diffMin(form.startTime, form.endTime)} min`
        : null;
    setLogs((prev) => [
      {
        id: Date.now(),
        babyId: activeBabyId,
        ...form,
        duration,
        date: new Date().toLocaleDateString("es-ES"),
      },
      ...prev,
    ]);
    setAdding(false);
    setForm({ type: "sleep", startTime: getNow(), endTime: "", notes: "" });
  };

  const today = new Date().toLocaleDateString("es-ES");
  const todayLogs = logs.filter((l) => l.date === today);
  const totalSleep = todayLogs
    .filter((l) => l.type === "sleep" || l.type === "nap")
    .reduce((acc, l) => acc + (parseInt(l.duration ?? "0") || 0), 0);

  return (
    <div style={{ padding: "20px 20px 40px" }}>

      {/* Summary */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.olive})`, borderRadius: 16, padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 4 }}>
          {babyName} · Hoy
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {totalSleep}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 }}>min de sueño</div>
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.25)", paddingLeft: 28 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {todayLogs.length}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 }}>registros</div>
          </div>
        </div>
      </div>

      {/* Add form */}
      {adding ? (
        <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", marginBottom: 14, boxShadow: "0 2px 12px rgba(100,125,131,0.08)" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: COLORS.teal, marginBottom: 14 }}>
            Nuevo registro · {babyName}
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["sleep", "nap", "feed"] as const).map((k) => (
              <button key={k} onClick={() => setForm({ ...form, type: k })}
                style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Niramit', sans-serif", background: form.type === k ? TYPE_CONFIG[k].color : COLORS.cream, color: form.type === k ? "#fff" : COLORS.teal, transition: "all 0.2s" }}>
                {TYPE_CONFIG[k].icon} {TYPE_CONFIG[k].label.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Fields */}
          {[
            { label: "Inicio", field: "startTime", type: "time" },
            ...(form.type !== "feed" ? [{ label: "Fin", field: "endTime", type: "time" }] : []),
            { label: "Notas", field: "notes", type: "text", placeholder: "opcional…" },
          ].map((f) => (
            <div key={f.field} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.olive, width: 70 }}>{f.label}</span>
              <input
                style={{ border: `1.5px solid ${COLORS.sage}`, borderRadius: 8, padding: "7px 10px", fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444", background: COLORS.cream, outline: "none", flex: 1 }}
                type={f.type}
                placeholder={(f as any).placeholder}
                value={(form as any)[f.field]}
                onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
              />
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={{ flex: 1, padding: 10, border: "none", borderRadius: 10, background: COLORS.cream, color: COLORS.teal, fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              onClick={() => setAdding(false)}>Cancelar</button>
            <button style={{ flex: 2, padding: 10, border: "none", borderRadius: 10, background: COLORS.teal, color: "#fff", fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              onClick={addLog}>Guardar</button>
          </div>
        </div>
      ) : (
        <button
          style={{ width: "100%", padding: 14, marginBottom: 14, border: `1.5px dashed ${COLORS.sage}`, borderRadius: 12, background: "transparent", color: COLORS.teal, fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onClick={() => setAdding(true)}>
          ＋ Agregar registro para {babyName}
        </button>
      )}

      {/* Log list */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 2px 12px rgba(100,125,131,0.08)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: COLORS.teal, marginBottom: 12 }}>
          Historial de hoy
        </div>
        {todayLogs.length === 0 && (
          <p style={{ color: "#bbb", fontSize: 13, textAlign: "center" as const, padding: "12px 0" }}>
            Sin registros todavía 🌙
          </p>
        )}
        {todayLogs.map((log) => {
          const cfg = TYPE_CONFIG[log.type];
          return (
            <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.cream}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#444", fontSize: 13 }}>{cfg.label}</div>
                  {log.notes && <div style={{ fontSize: 11, color: "#aaa" }}>{log.notes}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 12, color: COLORS.teal, fontWeight: 600 }}>{fmtTime(log.startTime)}</div>
                {log.duration && (
                  <span style={{ background: cfg.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, color: "#fff", marginTop: 2, display: "inline-block" }}>
                    {log.duration}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
