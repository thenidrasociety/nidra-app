import React, { useState } from "react";
import { supabase } from "../supabase";

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

const diffMin = (start: string, end: string): number => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  // If negative, sleep crossed midnight — add 24 hours
  if (mins < 0) mins += 24 * 60;
  return mins;
};

const fmtDuration = (mins: number): string => {
  if (mins <= 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

// Parse any duration string to minutes — handles "720 min", "11h", "11h 30min", "2h 15min"
const parseDurationToMins = (raw: string | null): number => {
  if (!raw) return 0;
  if (raw.includes("h")) {
    const hMatch = raw.match(/(\d+)h/);
    const mMatch = raw.match(/(\d+)min/);
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    const m = mMatch ? parseInt(mMatch[1]) : 0;
    return h * 60 + m;
  }
  return parseInt(raw) || 0;
};

interface Props {
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
  activeBabyId: string;
  babyName: string;
}

type FormState = { type: "sleep" | "nap" | "feed"; startTime: string; endTime: string; notes: string; };

export default function SleepTracker({ logs, setLogs, activeBabyId, babyName }: Props) {
  const [form, setForm] = useState<FormState>({ type: "sleep", startTime: getNow(), endTime: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>({ type: "sleep", startTime: "", endTime: "", notes: "" });

  // ── Add ───────────────────────────────────────────────────────────────────
  const addLog = () => {
    if (!form.startTime) return;
    const mins = form.endTime && form.type !== "feed" ? diffMin(form.startTime, form.endTime) : 0;
    const duration = form.endTime && form.type !== "feed" ? fmtDuration(mins) : null;
    const newEntry: LogEntry = {
      id: Date.now(), babyId: activeBabyId, ...form, duration,
      date: new Date().toLocaleDateString("es-ES"),
    };
    setLogs([newEntry, ...logs]);
    setAdding(false);
    setForm({ type: "sleep", startTime: getNow(), endTime: "", notes: "" });
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (log: LogEntry) => {
    setEditingId(log.id);
    setEditForm({ type: log.type, startTime: log.startTime, endTime: log.endTime || "", notes: log.notes || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const mins = editForm.endTime && editForm.type !== "feed" ? diffMin(editForm.startTime, editForm.endTime) : 0;
    const duration = editForm.endTime && editForm.type !== "feed" ? fmtDuration(mins) : null;
    const updated = logs.map(l => l.id === editingId
      ? { ...l, ...editForm, duration }
      : l
    );
    setLogs(updated);
    // Update in Supabase
    await supabase.from("sleep_logs").update({
      type: editForm.type,
      start_time: editForm.startTime,
      end_time: editForm.endTime || null,
      notes: editForm.notes || null,
      duration,
    }).eq("id", editingId);
    setEditingId(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteLog = async (id: number) => {
    setLogs(logs.filter(l => l.id !== id));
    await supabase.from("sleep_logs").delete().eq("id", id);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("es-ES");
  const todayLogs = logs.filter(l => l.date === today);
  const totalSleepMins = todayLogs
    .filter(l => l.type === "sleep" || l.type === "nap")
    .reduce((acc, l) => acc + parseDurationToMins(l.duration), 0);

  const inputStyle: React.CSSProperties = {
    border: `1.5px solid ${COLORS.sage}`, borderRadius: 8, padding: "7px 10px",
    fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444",
    background: COLORS.cream, outline: "none", flex: 1,
  };

  const renderForm = (f: FormState, setF: (f: FormState) => void, onSave: () => void, onCancel: () => void, title: string) => (
    <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", marginBottom: 14, boxShadow: "0 2px 12px rgba(100,125,131,0.08)" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 18, color: COLORS.teal, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["sleep", "nap", "feed"] as const).map(k => (
          <button key={k} onClick={() => setF({ ...f, type: k })}
            style={{ flex: 1, padding: "8px 4px", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Niramit', sans-serif", background: f.type === k ? TYPE_CONFIG[k].color : COLORS.cream, color: f.type === k ? "#fff" : COLORS.teal }}>
            {TYPE_CONFIG[k].icon} {TYPE_CONFIG[k].label.split(" ")[0]}
          </button>
        ))}
      </div>
      {[
        { label: "Inicio", field: "startTime", type: "time" },
        ...(f.type !== "feed" ? [{ label: "Fin", field: "endTime", type: "time" }] : []),
        { label: "Notas", field: "notes", type: "text", placeholder: "opcional…" },
      ].map(field => (
        <div key={field.field} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: COLORS.olive, width: 70 }}>{field.label}</span>
          <input style={inputStyle} type={field.type} placeholder={(field as any).placeholder}
            value={(f as any)[field.field]} onChange={e => setF({ ...f, [field.field]: e.target.value })} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button style={{ flex: 1, padding: 10, border: "none", borderRadius: 10, background: COLORS.cream, color: COLORS.teal, fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onClick={onCancel}>Cancelar</button>
        <button style={{ flex: 2, padding: 10, border: "none", borderRadius: 10, background: COLORS.teal, color: "#fff", fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onClick={onSave}>Guardar</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "20px 20px 40px" }}>

      {/* Summary */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.olive})`, borderRadius: 16, padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
          {babyName} · Hoy
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {fmtDuration(totalSleepMins)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 }}>de sueño hoy</div>
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.25)", paddingLeft: 28 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {todayLogs.length}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 }}>registros</div>
          </div>
        </div>
      </div>

      {/* Add form */}
      {adding
        ? renderForm(form, setForm, addLog, () => setAdding(false), `Nuevo registro · ${babyName}`)
        : (
          <button style={{ width: "100%", padding: 14, marginBottom: 14, border: `1.5px dashed ${COLORS.sage}`, borderRadius: 12, background: "transparent", color: COLORS.teal, fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onClick={() => setAdding(true)}>
            ＋ Agregar registro para {babyName}
          </button>
        )}

      {/* Edit form */}
      {editingId !== null && renderForm(
        editForm, setEditForm, saveEdit, () => setEditingId(null), "Editar registro"
      )}

      {/* Log list */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 2px 12px rgba(100,125,131,0.08)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: COLORS.teal, marginBottom: 12 }}>
          Historial de hoy
        </div>
        {todayLogs.length === 0 && (
          <p style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin registros todavía 🌙</p>
        )}
        {todayLogs.map(log => {
          const cfg = TYPE_CONFIG[log.type];
          const displayDuration = log.duration
            ? (log.duration.includes("h") ? log.duration : fmtDuration(parseDurationToMins(log.duration)))
            : (log.startTime && log.endTime ? fmtDuration(diffMin(log.startTime, log.endTime)) : null);
          return (
            <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.cream}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#444", fontSize: 13 }}>{cfg.label}</div>
                  {log.notes && <div style={{ fontSize: 11, color: "#aaa" }}>{log.notes}</div>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: COLORS.teal, fontWeight: 600 }}>{fmtTime(log.startTime)}</div>
                  {displayDuration && (
                    <span style={{ background: cfg.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, color: "#fff", marginTop: 2, display: "inline-block" }}>
                      {displayDuration}
                    </span>
                  )}
                </div>
                {/* Icon buttons */}
                <button onClick={() => startEdit(log)}
                  style={{ background: COLORS.cream, border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ✏️
                </button>
                <button onClick={() => deleteLog(log.id)}
                  style={{ background: "#fdf0f0", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
