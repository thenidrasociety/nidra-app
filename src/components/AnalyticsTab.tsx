import React, { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { LogEntry } from "./SleepTracker";

const C = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  lavender: "#C4C3CC",
  cream: "#EBE7E0",
};

const fmt12 = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "p" : "a"}`;
};

const timeToMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(100,125,131,0.07)", ...style }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ background: C.cream, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: C.olive, letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.teal, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: subColor || C.olive, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 17, color: C.teal, marginBottom: 4 }}>
      {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>{children}</div>;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
      {items.map((item) => (
        <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#777" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: "inline-block" }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

interface Props {
  logs: LogEntry[];
  babyName?: string;
}

export default function AnalyticsTab({ logs, babyName = "Mi bebé" }: Props) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const today = new Date().toLocaleDateString("es-ES");
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // ── Day data ────────────────────────────────────────────────────────────────
  const todayLogs = logs.filter((l) => l.date === today);
  const todaySleep = todayLogs.filter((l) => l.type === "sleep" || l.type === "nap").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
  const todayNaps = todayLogs.filter((l) => l.type === "nap").length;
  const todayFeeds = todayLogs.filter((l) => l.type === "feed").length;
  const todayBedtime = todayLogs.find((l) => l.type === "sleep")?.startTime ?? "";

  const dayBarData = [
    { name: "Nocturno", mins: todayLogs.filter((l) => l.type === "sleep").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0) },
    { name: "Siestas", mins: todayLogs.filter((l) => l.type === "nap").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0) },
  ];

  // ── Week data ───────────────────────────────────────────────────────────────
  const getLast7 = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("es-ES");
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const sleep = dayLogs.filter((l) => l.type === "sleep").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
      const naps = dayLogs.filter((l) => l.type === "nap").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
      const bed = dayLogs.find((l) => l.type === "sleep");
      const bedMins = bed ? timeToMins(bed.startTime) : null;
      result.push({
        day: days[d.getDay()],
        sleepH: parseFloat((sleep / 60).toFixed(1)),
        napH: parseFloat((naps / 60).toFixed(1)),
        bedMins,
        napCount: dayLogs.filter((l) => l.type === "nap").length,
      });
    }
    return result;
  };
  const weekData = getLast7();
  const avgSleep = weekData.length ? parseFloat((weekData.reduce((a, d) => a + d.sleepH, 0) / weekData.length).toFixed(1)) : 0;
  const avgNaps = weekData.length ? parseFloat((weekData.reduce((a, d) => a + d.napCount, 0) / weekData.length).toFixed(1)) : 0;

  // ── Month data ──────────────────────────────────────────────────────────────
  const getLast4Weeks = () => {
    const result = [];
    for (let w = 3; w >= 0; w--) {
      let totalSleep = 0, totalNaps = 0, count = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - w * 7 - d);
        const dateStr = date.toLocaleDateString("es-ES");
        const dayLogs = logs.filter((l) => l.date === dateStr);
        totalSleep += dayLogs.filter((l) => l.type === "sleep").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
        totalNaps += dayLogs.filter((l) => l.type === "nap").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
        count++;
      }
      result.push({
        week: `Sem ${4 - w}`,
        sleepH: parseFloat((totalSleep / 60 / (count || 1)).toFixed(1)),
        totalH: parseFloat(((totalSleep + totalNaps) / 60 / (count || 1)).toFixed(1)),
      });
    }
    return result;
  };
  const monthData = getLast4Weeks();
  const totalSleepMonth = logs.filter((l) => l.type === "sleep").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
  const totalNapMonth = logs.filter((l) => l.type === "nap").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0);
  const totalAll = totalSleepMonth + totalNapMonth;
  const pieData = [
    { name: "Nocturno", value: totalSleepMonth || 1 },
    { name: "Siestas", value: totalNapMonth || 1 },
  ];
  const pct = totalAll > 0 ? Math.round((totalSleepMonth / totalAll) * 100) : 74;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px 4px", border: "none",
    background: active ? C.teal : "#fff",
    color: active ? "#fff" : "#aaa",
    fontFamily: "'Niramit', sans-serif",
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: "pointer",
    borderRadius: 20,
    transition: "all 0.2s",
  });

  const hasData = logs.length > 0;

  const EmptyState = () => (
    <div style={{ textAlign: "center", padding: "32px 0", color: "#bbb", fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🌙</div>
      Agrega registros en la pestaña Registro para ver tus análisis aquí.
    </div>
  );

  return (
    <div style={{ padding: "20px 20px 80px" }}>

      {/* Baby name label */}
      <div style={{ fontSize: 12, color: C.teal, fontWeight: 600, marginBottom: 10 }}>🌙 {babyName}</div>

      {/* Period selector */}
      <div style={{ display: "flex", background: "#fff", borderRadius: 24, padding: 4, marginBottom: 16, boxShadow: "0 1px 6px rgba(100,125,131,0.08)" }}>
        {(["day", "week", "month"] as const).map((p) => (
          <button key={p} style={tabStyle(period === p)} onClick={() => setPeriod(p)}>
            {p === "day" ? "Hoy" : p === "week" ? "7 días" : "30 días"}
          </button>
        ))}
      </div>

      {/* ── DAY ── */}
      {period === "day" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <MetricCard label="Sueño total" value={`${Math.round(todaySleep / 60 * 10) / 10}h`} sub={`${todaySleep} min`} />
            <MetricCard label="Siestas hoy" value={String(todayNaps)} sub={`${todayLogs.filter(l => l.type === "nap").reduce((a, l) => a + (parseInt(l.duration ?? "0") || 0), 0)} min`} />
            <MetricCard label="Hora de dormir" value={todayBedtime ? fmt12(todayBedtime) : "–"} />
            <MetricCard label="Tomas" value={String(todayFeeds)} />
          </div>

          <Card>
            <SectionTitle>Sueño vs siestas</SectionTitle>
            <SubTitle>Distribución de hoy en minutos</SubTitle>
            <Legend items={[{ color: C.teal, label: "Nocturno" }, { color: C.olive, label: "Siestas" }]} />
            {hasData ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dayBarData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cream} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`} />
                  <Tooltip formatter={(v: any) => [`${v} min`]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.sage}`, fontSize: 12 }} />
                  <Bar dataKey="mins" radius={[8, 8, 0, 0]}>
                    <Cell fill={C.teal} />
                    <Cell fill={C.olive} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>

          {hasData && (
            <Card style={{ background: `linear-gradient(135deg, ${C.lavender}33, ${C.sage}33)` }}>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 300, lineHeight: 1.7 }}>
                💡 <strong style={{ fontWeight: 600, color: C.teal }}>Patrón de hoy:</strong> Llevas {todaySleep} min de sueño total con {todayNaps} siesta{todayNaps !== 1 ? "s" : ""} y {todayFeeds} toma{todayFeeds !== 1 ? "s" : ""}. Sigue registrando para ver tendencias.
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── WEEK ── */}
      {period === "week" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <MetricCard label="Promedio nocturno" value={`${avgSleep}h`} sub="últimos 7 días" />
            <MetricCard label="Siestas/día" value={String(avgNaps)} sub="promedio" />
          </div>

          <Card>
            <SectionTitle>Sueño nocturno — 7 días</SectionTitle>
            <SubTitle>Horas de sueño por noche</SubTitle>
            <Legend items={[{ color: C.teal, label: "Nocturno" }, { color: C.sage, label: "Meta 9h" }]} />
            {hasData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cream} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} domain={[0, 12]} />
                  <Tooltip formatter={(v: any) => [`${v}h`]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.sage}`, fontSize: 12 }} />
                  <ReferenceLine y={9} stroke={C.sage} strokeDasharray="4 4" strokeWidth={1.5} />
                  <Bar dataKey="sleepH" fill={C.teal} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>

          <Card>
            <SectionTitle>Siestas — duración diaria</SectionTitle>
            <SubTitle>Horas de siesta por día</SubTitle>
            {hasData ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cream} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} domain={[0, 5]} />
                  <Tooltip formatter={(v: any) => [`${v}h`]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.sage}`, fontSize: 12 }} />
                  <Bar dataKey="napH" fill={C.lavender} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>

          <Card>
            <SectionTitle>Hora de dormir — patrón semanal</SectionTitle>
            <SubTitle>Variaciones en la rutina nocturna</SubTitle>
            <Legend items={[{ color: C.olive, label: "Hora real" }, { color: C.sage, label: "Meta 7:30 pm" }]} />
            {hasData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weekData.filter(d => d.bedMins !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cream} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => { const h = Math.floor(v / 60); const m = v % 60; return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "p" : "a"}`; }}
                    domain={[18 * 60, 21 * 60]} />
                  <Tooltip formatter={(v: any) => { const h = Math.floor(v / 60); const m = v % 60; return [`${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`]; }} contentStyle={{ borderRadius: 8, border: `1px solid ${C.sage}`, fontSize: 12 }} />
                  <ReferenceLine y={19 * 60 + 30} stroke={C.sage} strokeDasharray="4 4" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="bedMins" stroke={C.olive} strokeWidth={2} dot={{ fill: C.olive, r: 4 }} activeDot={{ r: 6 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>
        </>
      )}

      {/* ── MONTH ── */}
      {period === "month" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <MetricCard label="Promedio semanal" value={`${monthData[monthData.length - 1]?.sleepH ?? 0}h`} sub="sueño nocturno" />
            <MetricCard label="Mejor semana" value={`Sem ${monthData.reduce((best, w, i) => w.sleepH > monthData[best].sleepH ? i : best, 0) + 1}`} sub={`${Math.max(...monthData.map(w => w.sleepH))}h prom.`} />
          </div>

          <Card>
            <SectionTitle>Tendencia mensual</SectionTitle>
            <SubTitle>Evolución semana a semana</SubTitle>
            <Legend items={[{ color: C.teal, label: "Nocturno" }, { color: C.olive, label: "Total con siestas" }]} />
            {hasData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cream} />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} domain={[0, 14]} />
                  <Tooltip formatter={(v: any) => [`${v}h`]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.sage}`, fontSize: 12 }} />
                  <Line type="monotone" dataKey="sleepH" stroke={C.teal} strokeWidth={2.5} dot={{ fill: C.teal, r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="totalH" stroke={C.olive} strokeWidth={2} strokeDasharray="4 4" dot={{ fill: C.olive, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>

          <Card>
            <SectionTitle>Nocturno vs siestas</SectionTitle>
            <SubTitle>Proporción mensual acumulada</SubTitle>
            <Legend items={[{ color: C.teal, label: `Nocturno ${pct}%` }, { color: C.olive, label: `Siestas ${100 - pct}%` }]} />
            {hasData ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    <Cell fill={C.teal} />
                    <Cell fill={C.olive} />
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [`${Math.round(v / 60)}h`, name]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.sage}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>
        </>
      )}
    </div>
  );
}
