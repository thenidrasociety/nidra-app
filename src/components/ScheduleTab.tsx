import React, { useState, useEffect } from "react";
import { useAppConfig } from "../NidraApp";

const C = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  lavender: "#C4C3CC",
  cream: "#EBE7E0",
};

const AGES = [
  { label: "0–3 meses",   sub: "5–7 siestas",  erratic: true,  napCount: 5, napMin: 5, napMax: 7, wwMin: 30,  wwMax: 75,  napDur: 90,  sleep24: "14–18h" },
  { label: "3–4 meses",   sub: "3–4 siestas",  erratic: false, napCount: 4, napMin: 3, napMax: 5, wwMin: 60,  wwMax: 120, napDur: null, sleep24: "13–18h" },
  { label: "5–6 meses",   sub: "3 siestas",    erratic: false, napCount: 3, napMin: 3, napMax: 4, wwMin: 90,  wwMax: 150, napDur: null, sleep24: "12.5–17h" },
  { label: "7–8 meses",   sub: "2–3 siestas",  erratic: false, napCount: 3, napMin: 2, napMax: 4, wwMin: 120, wwMax: 240, napDur: null, sleep24: "12.5–17h" },
  { label: "9–12 meses",  sub: "2 siestas",    erratic: false, napCount: 2, napMin: 2, napMax: 3, wwMin: 150, wwMax: 240, napDur: null, sleep24: "12.5–16h" },
  { label: "13–17 meses", sub: "1–2 siestas",  erratic: false, napCount: 2, napMin: 1, napMax: 3, wwMin: 180, wwMax: 360, napDur: null, sleep24: "12.5–15h" },
  { label: "18m–3 años",  sub: "1 siesta",     erratic: false, napCount: 1, napMin: 1, napMax: 2, wwMin: 240, wwMax: 420, napDur: null, sleep24: "11–14h" },
  { label: "3–4 años",    sub: "0–1 siestas",  erratic: false, napCount: 1, napMin: 0, napMax: 2, wwMin: 300, wwMax: 480, napDur: null, sleep24: "10–13h" },
  { label: "4–5 años",    sub: "0 siestas",    erratic: false, napCount: 0, napMin: 0, napMax: 0, wwMin: 420, wwMax: 480, napDur: null, sleep24: "10–12h" },
];

const SUGGESTED: Record<number, { label: string; start: number; wakeBy: number; durMin: number; durMax: number }[]> = {
  4: [
    { label: "Siesta 1",       start: 8*60+30, wakeBy: 10*60+30, durMin: 30, durMax: 60 },
    { label: "Siesta 2",       start: 11*60,   wakeBy: 13*60+30, durMin: 30, durMax: 60 },
    { label: "Siesta 3",       start: 14*60,   wakeBy: 15*60+30, durMin: 30, durMax: 45 },
    { label: "Siesta 4 (cat)", start: 16*60,   wakeBy: 17*60,    durMin: 20, durMax: 30 },
  ],
  3: [
    { label: "Siesta 1",        start: 8*60+30,  wakeBy: 10*60+30, durMin: 45, durMax: 90 },
    { label: "Siesta 2",        start: 12*60+30, wakeBy: 14*60+30, durMin: 45, durMax: 90 },
    { label: "Siesta 3 (cat)",  start: 16*60+30, wakeBy: 17*60+30, durMin: 20, durMax: 30 },
  ],
  2: [
    { label: "Siesta mañana",   start: 9*60+30,  wakeBy: 11*60,    durMin: 60, durMax: 90 },
    { label: "Siesta tarde",    start: 14*60+30, wakeBy: 16*60,    durMin: 60, durMax: 90 },
  ],
  1: [
    { label: "Siesta mediodía", start: 12*60+30, wakeBy: 15*60,    durMin: 90, durMax: 150 },
  ],
};

const BASE_WAKE = 7 * 60;
const BASE_BED  = 19 * 60;

interface RowData {
  id: string;
  type: "wake" | "nap" | "bed";
  label: string;
  startMins: number;
  wakeUpMins: number | null;
  durMin: number;
  durMax: number;
  adjusted: boolean;
  extra: boolean;
  erratic?: boolean;
}

// Per-baby schedule state
interface BabyScheduleState {
  selAge: number;
  rows: RowData[];
}

const fmt = (m: number) => {
  const t = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60), mn = t % 60;
  return `${h % 12 || 12}:${String(mn).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};
const durStr = (a: number, b: number) => {
  if (!a && !b) return "";
  if (b < 60) return `${a}–${b} min`;
  const x = (a / 60).toFixed(1).replace(".0", ""), y = (b / 60).toFixed(1).replace(".0", "");
  return x === y ? `${x}h` : `${x}–${y}h`;
};
const wwStr = (a: number, b: number) => {
  if (b < 60) return `${a}–${b} min`;
  const x = (a / 60).toFixed(1).replace(".0", ""), y = (b / 60).toFixed(1).replace(".0", "");
  return `${x}–${y}h`;
};

function buildRows(ageIdx: number, wakeOverride?: number): RowData[] {
  const age = AGES[ageIdx];
  const wake = wakeOverride !== undefined ? wakeOverride : BASE_WAKE;
  const shift = wake - BASE_WAKE;
  const bed = wake + (BASE_BED - BASE_WAKE);
  const result: RowData[] = [];

  result.push({ id: "w", type: "wake", label: "Despertar", startMins: wake, wakeUpMins: null, durMin: 0, durMax: 0, adjusted: false, extra: false });

  if (age.erratic) {
    const wwAvg = 52, napDur = age.napDur ?? 90;
    let cur = wake + wwAvg;
    for (let i = 0; i < 5; i++) {
      const wakeUp = cur + napDur;
      if (cur >= bed) break;
      result.push({ id: `n${i}`, type: "nap", label: `Siesta ${i + 1}`, startMins: cur, wakeUpMins: Math.min(wakeUp, bed - 30), durMin: 75, durMax: 90, adjusted: false, extra: false, erratic: true });
      cur = Math.min(wakeUp, bed - 30) + wwAvg;
    }
  } else {
    const sug = SUGGESTED[age.napCount] ?? [];
    sug.forEach((n, i) => {
      result.push({ id: `n${i}`, type: "nap", label: n.label, startMins: n.start + shift, wakeUpMins: n.wakeBy + shift, durMin: n.durMin, durMax: n.durMax, adjusted: false, extra: false });
    });
  }

  result.push({ id: "b", type: "bed", label: "Dormir noche", startMins: bed, wakeUpMins: null, durMin: 0, durMax: 0, adjusted: false, extra: false });
  return result;
}

export default function ScheduleTab() {
  const { config } = useAppConfig();
  const activeBabyId = config.activeBabyId;
  const activeBaby = config.babies.find(b => b.id === activeBabyId) ?? config.babies[0];

  // Per-baby schedule state map
  const [scheduleMap, setScheduleMap] = useState<Record<string, BabyScheduleState>>({});
  const [editIdx, setEditIdx] = useState<number | null>(null);

  // Get or initialize state for active baby
  const babyState: BabyScheduleState = scheduleMap[activeBabyId] ?? { selAge: 4, rows: buildRows(4) };
  const { selAge, rows } = babyState;
  const age = AGES[selAge];
  const napCount = rows.filter(r => r.type === "nap").length;

  // Reset editIdx when switching baby
  useEffect(() => { setEditIdx(null); }, [activeBabyId]);

  const updateBaby = (updates: Partial<BabyScheduleState>) => {
    setScheduleMap(prev => ({
      ...prev,
      [activeBabyId]: { ...babyState, ...updates },
    }));
  };

  const selectAge = (i: number) => {
    setEditIdx(null);
    updateBaby({ selAge: i, rows: buildRows(i) });
  };

  const addExtraNap = () => {
    const napIdxs = rows.reduce((a: number[], r, i) => r.type === "nap" ? [...a, i] : a, []);
    const bedIdx = rows.findIndex(r => r.type === "bed");
    const lastNapIdx = napIdxs.length ? napIdxs[napIdxs.length - 1] : -1;
    const prevEnd = lastNapIdx >= 0 ? (rows[lastNapIdx].wakeUpMins ?? rows[lastNapIdx].startMins + 45) : rows[0].startMins + 60;
    const mid = Math.round((prevEnd + rows[bedIdx].startMins) / 2);
    const newRows = [...rows];
    newRows.splice(lastNapIdx + 1, 0, { id: `x${Date.now()}`, type: "nap", label: "Siesta extra", startMins: mid, wakeUpMins: mid + 32, durMin: 20, durMax: 45, adjusted: true, extra: true });
    updateBaby({ rows: newRows });
  };

  const removeLastNap = () => {
    let lastIdx = -1;
    rows.forEach((r, i) => { if (r.type === "nap") lastIdx = i; });
    if (lastIdx < 0) return;
    updateBaby({ rows: rows.filter((_, i) => i !== lastIdx) });
  };

  const applyEdit = (i: number, val: string) => {
    const [hh, mm] = val.split(":").map(Number);
    const newStart = hh * 60 + mm;
    let newRows: RowData[];
    if (rows[i].type === "wake") {
      newRows = buildRows(selAge, newStart);
      newRows[0].adjusted = true;
    } else {
      const diff = newStart - rows[i].startMins;
      newRows = rows.map((r, idx) => {
        if (idx < i) return r;
        if (idx === i) return { ...r, startMins: newStart, wakeUpMins: r.wakeUpMins !== null ? newStart + Math.round((r.durMin + r.durMax) / 2) : null, adjusted: true };
        return { ...r, startMins: r.startMins + diff, wakeUpMins: r.wakeUpMins !== null ? r.wakeUpMins + diff : null, adjusted: true };
      });
    }
    updateBaby({ rows: newRows });
    setEditIdx(null);
  };

  const lastNapId = rows.filter(r => r.type === "nap").slice(-1)[0]?.id;

  return (
    <div style={{ padding: "20px 20px 80px", fontFamily: "'Niramit', sans-serif" }}>

      {/* Baby label */}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 12 }}>
        🌙 Horario de {activeBaby.name}
      </div>

      {/* Age selector */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(100,125,131,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 18, color: C.teal }}>Horario sugerido</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: C.cream, color: C.teal }}>{age.sub}</span>
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>Selecciona la edad de {activeBaby.name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {AGES.map((a, i) => (
            <button key={i} onClick={() => selectAge(i)}
              style={{ padding: "9px 6px", border: `0.5px solid ${i === selAge ? C.teal : "#e0e0e0"}`, borderRadius: 8, background: i === selAge ? C.teal : "#fff", color: i === selAge ? "#fff" : "#888", fontSize: 11, fontWeight: i === selAge ? 600 : 400, cursor: "pointer", textAlign: "center", lineHeight: 1.4, fontFamily: "'Niramit', sans-serif" }}>
              {a.label}
              <span style={{ fontSize: 10, opacity: 0.75, display: "block", marginTop: 2 }}>{a.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Erratic notice */}
      {age.erratic && (
        <div style={{ borderRadius: "0 12px 12px 0", borderLeft: `3px solid #C4A882`, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#777", lineHeight: 1.6, background: "#fdf8f2" }}>
          ⚠️ <strong>El sueño a esta edad es muy errático.</strong> Sigue las ventanas de vigilia en lugar de un horario fijo. Los bebés duermen ~1.5h por tramo y se despiertan para comer cada 2–3h.
        </div>
      )}

      {/* No nap notice */}
      {age.napCount === 0 && (
        <div style={{ borderRadius: "0 12px 12px 0", borderLeft: `3px solid ${C.olive}`, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#777", lineHeight: 1.6, background: C.cream }}>
          🌙 Sin siesta. {activeBaby.name} se mantiene despierto 12 horas continuas.
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ borderRadius: "0 12px 12px 0", borderLeft: `3px solid ${C.olive}`, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#777", lineHeight: 1.6, background: "#f9f7f4" }}>
        ℹ️ Referencia basada en evidencia. Ajusta los horarios a la realidad de {activeBaby.name} — cada bebé es diferente.
      </div>

      {/* Schedule list */}
      {age.napCount > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(100,125,131,0.07)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Horario del día</div>

          {rows.map((ev, i) => {
            const isLastNap = ev.type === "nap" && ev.id === lastNapId;
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.cream}` : "none" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.type === "nap" ? C.olive : C.teal, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{ev.label}</div>
                  {ev.type === "nap" && (
                    <>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                        {ev.erratic ? "Duración: ~1.5h" : `Duración: ${durStr(ev.durMin, ev.durMax)}`}
                      </div>
                      {ev.wakeUpMins && (
                        <div style={{ fontSize: 11, color: C.olive, marginTop: 2, fontWeight: 500 }}>
                          ↗ Despertar aprox. {fmt(ev.wakeUpMins)}
                        </div>
                      )}
                      {ev.erratic && (
                        <div style={{ fontSize: 11, color: "#C4A882", marginTop: 2 }}>
                          💧 Despertar a comer si lleva 2–3h dormido
                        </div>
                      )}
                    </>
                  )}
                  {ev.type === "wake" && (
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                      12h despierto · Dormir noche a las {fmt(ev.startMins + 12 * 60)}
                    </div>
                  )}
                  {ev.type === "bed" && (
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>12h después del despertar</div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: ev.adjusted ? "#fdf3e3" : C.cream, color: ev.adjusted ? "#B07D40" : C.teal }}>
                      {ev.extra ? "extra" : ev.adjusted ? "ajustado" : "sugerido"}
                    </span>
                    {isLastNap && napCount > age.napMin && (
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#fceaea", color: "#a03030" }}>última siesta</span>
                    )}
                  </div>
                </div>

                {editIdx === i ? (
                  <input type="time"
                    defaultValue={`${String(Math.floor(((ev.startMins % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((ev.startMins % 1440) + 1440) % 1440 % 60).padStart(2, "0")}`}
                    autoFocus
                    onChange={e => applyEdit(i, e.target.value)}
                    onBlur={() => setEditIdx(null)}
                    style={{ border: `1.5px solid ${C.teal}`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: C.teal, background: C.cream, outline: "none", width: 90, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.teal, minWidth: 62, textAlign: "right" }}>{fmt(ev.startMins)}</span>
                    <button onClick={() => setEditIdx(i)}
                      style={{ background: "none", border: `0.5px solid #ddd`, borderRadius: 6, padding: "3px 7px", fontSize: 11, color: "#aaa", cursor: "pointer" }}>✏️</button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add / Remove buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {napCount < age.napMax && (
              <button onClick={addExtraNap}
                style={{ flex: 1, padding: 10, border: `0.5px dashed ${C.sage}`, borderRadius: 10, background: "transparent", color: C.teal, fontSize: 12, fontFamily: "'Niramit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                ＋ Agregar siesta
              </button>
            )}
            {napCount > age.napMin && (
              <button onClick={removeLastNap}
                style={{ flex: 1, padding: 10, border: "0.5px dashed #d9a0a0", borderRadius: 10, background: "transparent", color: "#a03030", fontSize: 12, fontFamily: "'Niramit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                － Quitar última
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(100,125,131,0.07)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Referencias del día</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Sueño / 24h",  value: age.sleep24 },
            { label: "Vigilia",       value: wwStr(age.wwMin, age.wwMax) },
            { label: "Despertar",     value: fmt(rows[0]?.startMins ?? BASE_WAKE) },
            { label: "Dormir noche",  value: fmt(rows[rows.length - 1]?.startMins ?? BASE_BED) },
          ].map(s => (
            <div key={s.label} style={{ background: C.cream, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: C.olive, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.teal }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wake window */}
      <div style={{ background: C.cream, borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 5 }}>🕐 Ventana de vigilia</div>
        <div style={{ fontSize: 12, color: "#777", lineHeight: 1.7 }}>
          {age.erratic
            ? `Ventana: ${age.wwMin}–${age.wwMax} min. Los bebés duermen ~1.5h por tramo y se despiertan para comer cada 2–3h. Sueño total en 24h: ${age.sleep24}.`
            : `Ventana de vigilia: ${wwStr(age.wwMin, age.wwMax)}. Sueño total recomendado en 24h: ${age.sleep24}.`}
        </div>
      </div>
    </div>
  );
}
