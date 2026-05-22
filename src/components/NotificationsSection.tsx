import React, { useState, useEffect } from "react";

const C = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  cream: "#EBE7E0",
};

interface NotifSetting {
  id: string;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  time: string;         // "HH:MM" 24h
  minutesBefore?: number; // for "bajar estimulos" = 30 min before bedtime
}

interface Props {
  babyName: string;
  bedtimeMins: number;  // minutes from midnight, e.g. 19*60
  nap1Mins: number | null;
  nap2Mins: number | null;
}

const fmt12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const minsToTime = (mins: number): string => {
  const total = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function NotificationsSection({ babyName, bedtimeMins, nap1Mins, nap2Mins }: Props) {
  const STORAGE_KEY = "nidra_notif_settings";

  const defaultSettings = (): NotifSetting[] => [
    {
      id: "nap1",
      label: "Siesta 1",
      icon: "😴",
      description: `Hora de preparar a ${babyName} para su primera siesta`,
      enabled: false,
      time: minsToTime(nap1Mins ?? 9 * 60),
    },
    {
      id: "nap2",
      label: "Siesta 2",
      icon: "💤",
      description: `Hora de preparar a ${babyName} para su segunda siesta`,
      enabled: false,
      time: minsToTime(nap2Mins ?? 13 * 60),
    },
    {
      id: "estimulos",
      label: "Bajar estímulos",
      icon: "🔅",
      description: `Baja luces, apaga pantallas y baja la energía de la casa`,
      enabled: false,
      time: minsToTime(bedtimeMins - 30),
    },
    {
      id: "rutina",
      label: "Rutina nocturna",
      icon: "🌙",
      description: `Hora de empezar la rutina de noche de ${babyName}`,
      enabled: false,
      time: minsToTime(bedtimeMins),
    },
  ];

  const [settings, setSettings] = useState<NotifSetting[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSettings();
  });

  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const persist = (next: NotifSetting[]) => {
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const toggle = (id: string) => {
    const next = settings.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    persist(next);
  };

  const updateTime = (id: string, time: string) => {
    const next = settings.map(s => s.id === id ? { ...s, time } : s);
    persist(next);
    setEditingId(null);
  };

  const scheduleAll = () => {
    if (permission !== "granted") return;
    // Cancel all existing scheduled notifications and reschedule
    const enabled = settings.filter(s => s.enabled);
    if (enabled.length === 0) return;

    // Use repeated daily timeouts via a simple approach
    // Store in localStorage, check on page load / visibility change
    const schedules = enabled.map(s => ({ id: s.id, time: s.time, label: s.label, icon: s.icon, babyName }));
    try { localStorage.setItem("nidra_schedules", JSON.stringify(schedules)); } catch {}

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Fire next occurrence
    schedules.forEach(sc => scheduleNext(sc));
  };

  const scheduleNext = (sc: { id: string; time: string; label: string; icon: string; babyName: string }) => {
    const [h, m] = sc.time.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(`🌙 Nidra — ${sc.label}`, {
          body: getNotifBody(sc.id, sc.babyName),
          icon: "/logo192.png",
          badge: "/logo192.png",
          tag: sc.id,
        });
      }
      // Reschedule for tomorrow
      scheduleNext(sc);
    }, delay);
  };

  const getNotifBody = (id: string, name: string) => {
    switch (id) {
      case "nap1": return `¡Es hora de la primera siesta de ${name}! Empieza la rutina de siesta.`;
      case "nap2": return `¡Es hora de la segunda siesta de ${name}! Prepara el ambiente.`;
      case "estimulos": return `Baja las luces, apaga las pantallas y reduce la energía de la casa. La rutina nocturna de ${name} está por comenzar.`;
      case "rutina": return `¡Es hora de empezar la rutina de noche de ${name}! Leche → Baño → Pijama → Cuento → Peluches.`;
      default: return `Recordatorio de sueño para ${name}`;
    }
  };

  // On mount: re-schedule any saved notifications
  useEffect(() => {
    if (permission !== "granted") return;
    try {
      const saved = JSON.parse(localStorage.getItem("nidra_schedules") || "[]");
      saved.forEach((sc: any) => scheduleNext(sc));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(100,125,131,0.07)" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 18, color: C.teal, marginBottom: 4 }}>
        🔔 Recordatorios
      </div>
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14, lineHeight: 1.5 }}>
        Recibe notificaciones diarias para las siestas y rutina nocturna de {babyName}.
      </div>

      {/* Safari warning */}
      {isSafari && (
        <div style={{ background: "#fdf8f2", borderLeft: `3px solid #C4A882`, borderRadius: "0 10px 10px 0", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#8a6020", lineHeight: 1.5 }}>
          ⚠️ <strong>Las notificaciones no funcionan en Safari.</strong> Abre la app en <strong>Chrome</strong> para activar los recordatorios.
        </div>
      )}

      {/* Permission banner */}
      {!isSafari && permission === "default" && (
        <div style={{ background: C.cream, borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, color: C.teal, lineHeight: 1.5, flex: 1 }}>
            Permite las notificaciones para recibir recordatorios diarios.
          </div>
          <button onClick={requestPermission}
            style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Niramit', sans-serif", whiteSpace: "nowrap" }}>
            Permitir
          </button>
        </div>
      )}

      {permission === "denied" && (
        <div style={{ background: "#fdeaea", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#a03030", lineHeight: 1.5 }}>
          🚫 Bloqueaste las notificaciones. Ve a Configuración → Chrome → Notificaciones para activarlas.
        </div>
      )}

      {/* Notification toggles */}
      <div style={{ opacity: permission === "granted" ? 1 : 0.5 }}>
        {settings.map(s => (
          <div key={s.id} style={{ borderBottom: `1px solid ${C.cream}`, paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{s.description}</div>
                </div>
              </div>
              {/* Toggle */}
              <div onClick={() => permission === "granted" && toggle(s.id)}
                style={{ width: 42, height: 24, borderRadius: 12, background: s.enabled ? C.teal : "#ddd", cursor: permission === "granted" ? "pointer" : "not-allowed", position: "relative", flexShrink: 0, transition: "background .2s" }}>
                <div style={{ position: "absolute", top: 3, left: s.enabled ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            {/* Time picker */}
            {s.enabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingLeft: 30 }}>
                <span style={{ fontSize: 12, color: C.teal, fontWeight: 600 }}>⏰ {fmt12(s.time)}</span>
                {editingId === s.id ? (
                  <input type="time" defaultValue={s.time} autoFocus
                    onChange={e => e.target.value && updateTime(s.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    style={{ border: `1.5px solid ${C.teal}`, borderRadius: 8, padding: "3px 8px", fontSize: 12, color: C.teal, background: C.cream, outline: "none" }}
                  />
                ) : (
                  <button onClick={() => setEditingId(s.id)}
                    style={{ background: "none", border: `0.5px solid #ddd`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "#aaa", cursor: "pointer", fontFamily: "'Niramit', sans-serif" }}>
                    ✏️ Cambiar hora
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save button */}
      {permission === "granted" && settings.some(s => s.enabled) && (
        <button onClick={scheduleAll}
          style={{ width: "100%", padding: 12, background: saved ? C.olive : C.teal, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Niramit', sans-serif", transition: "background .3s" }}>
          {saved ? "✓ Recordatorios guardados" : "Activar recordatorios"}
        </button>
      )}

      {permission === "granted" && !settings.some(s => s.enabled) && (
        <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "8px 0" }}>
          Activa al menos un recordatorio para guardarlo.
        </div>
      )}
    </div>
  );
}
