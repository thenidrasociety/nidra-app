import React, { useState } from "react";
import { getAgeLabel } from "../NidraApp";

const C = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  lavender: "#C4C3CC",
  cream: "#EBE7E0",
};

const GOALS = [
  { id: "independent", label: "Enseñar sueño independiente" },
  { id: "monitor",     label: "Monitorear horario de sueño" },
  { id: "naps",        label: "Mejorar siestas" },
  { id: "transition",  label: "Transición de habitación o cama" },
  { id: "regression",  label: "Sobrellevar una regresión de sueño" },
  { id: "schedule",    label: "Establecer horario fijo" },
  { id: "nightfeed",   label: "Quitar tomas de leche por la noche" },
  { id: "wakings",     label: "Eliminar despertares nocturnos" },
  { id: "routine",     label: "Crear rutina de noche consistente" },
  { id: "overtired",   label: "Manejar sobre cansancio" },
  { id: "anxiety",     label: "Trabajar ansiedad por separación" },
  { id: "toddler",     label: "Herramientas para toddler (18m–4 años)" },
];

const TRAINING_GOALS = new Set(["independent", "naps", "wakings"]);

const PACE_OPTIONS = [
  { id: "slow",   icon: "🐢", label: "Muy gradual",  desc: "Eliminas una asociación completamente antes de pasar a la siguiente", time: "Resultados en 6–10 semanas", chairDays: 10, detail: "Se elimina una asociación de sueño completamente antes de pasar a la siguiente. Sin prisa, con mucha consistencia." },
  { id: "medium", icon: "🚶", label: "Moderado",      desc: "Vas eliminando asociaciones paso a paso con ritmo constante",         time: "Resultados en 3–4 semanas",  chairDays: 7,  detail: "Se eliminan las asociaciones gradualmente, avanzando cada 5–7 días cuando el bebé responde bien." },
  { id: "fast",   icon: "🏃", label: "Más rápido",    desc: "Presencia constante pero reduces el apoyo más rápido",                time: "Resultados en 1–2 semanas",  chairDays: 3,  detail: "Siempre presente y con apoyo, reduciendo el contacto más rápido. Avanzas cada 3 días." },
];

const QUESTIONS = [
  { id: "q1", label: "¿Qué significa para ti lograr tu objetivo? ¿Cómo te imaginas las noches ideales?" },
  { id: "q2", label: "Descríbeme paso a paso cómo duermes a tu bebé hoy. Sé muy específica — esto es clave para tu plan." },
  { id: "q3", label: "¿Cómo mejoraría tu vida y la de tu familia si lograras estos objetivos?" },
  { id: "q4", label: "¿Qué estás dispuesta a hacer y qué NO estás dispuesta a hacer?" },
  { id: "q5", label: "¿Hay algo más que quieras contarme? (viajes próximos, cambios de rutina, hermanito en camino, etc.)" },
];

const DEFAULT_LADDER = [
  { id: "shh",    label: "Shh shh desde donde estás",                             active: true,  custom: false },
  { id: "stand",  label: "Pararte al lado de la cuna",                             active: true,  custom: false },
  { id: "hand",   label: "Mano en el pecho",                                       active: true,  custom: false },
  { id: "pat",    label: "Palmaditas suaves",                                       active: true,  custom: false },
  { id: "stroke", label: "Caricias constantes",                                    active: true,  custom: false },
  { id: "cheek",  label: "Mejilla con mejilla",                                    active: true,  custom: false },
  { id: "hold",   label: "Cargar para calmar (no para dormir)",                    active: true,  custom: false },
  { id: "feed",   label: "Pecho/biberón (solo si no se elimina esta asociación)",  active: false, custom: false },
];

const LOOM_LADDER_URL = "https://www.loom.com/embed/01eab6175e814c00b1fea141f8413ec3";

const buildSystemPrompt = (pace?: string, ladderSteps?: string[], ageMonths?: number, babyName?: string) => {
  const paceInfo = pace ? PACE_OPTIONS.find(p => p.id === pace) : null;
  const ageText = ageMonths ? `El bebé tiene ${ageMonths} meses (${getAgeLabel(ageMonths.toString())}).` : "";
  const babyText = babyName ? `El bebé se llama ${babyName}.` : "";
  const isToddler = ageMonths ? ageMonths >= 18 : false;

  return `Eres Nidra, asistente experta de The Nidra Society, creada por Adri, consultora de sueño infantil y coach de crianza consciente certificada internacionalmente.

INFORMACIÓN DEL BEBÉ: ${babyText} ${ageText}

FILOSOFÍA: Nunca dejar llorar al bebé solo. Siempre presencia y acompañamiento. Gradual y respetuoso.

LÓGICA DE PIRÁMIDE — ASOCIACIONES DE SUEÑO (de más a menos dependencia):
Nivel 0: Dormir en pecho/colecho
Nivel 1: Dormir en pecho y pasar a cuna
Nivel 2: Pecho hasta dormirse completamente + cuna
Nivel 3: Pecho parcial + brazos para terminar de dormir
Nivel 4: Brazos con arrullos hasta dormirse
Nivel 5: Brazos sin arrullos hasta dormirse
Nivel 6: Brazos con caricias hasta dormirse
Nivel 7: Cuna con caricias 100% del tiempo
Nivel 8: Cuna con caricias reduciéndose gradualmente (70%, 50%, 30%...)
Nivel 9: Cuna con presencia sin contacto
Nivel 10: Dormirse solo

PARA LA PRIMERA DORMIDA (inicio de noche y siestas):
- Identifica en qué nivel está el bebé según la descripción de la mamá
- Da el siguiente paso concreto de la pirámide
- El objetivo es ir subiendo un nivel a la vez
- Nunca saltar más de un nivel según el ritmo elegido
- Siempre acostar al bebé DESPIERTO pero somnoliento para que desarrolle autorregulación

PARA LOS DESPERTARES (escalera de intervención):
Esta es SEPARADA de la pirámide. Cuando el bebé se despierta en la noche:
${ladderSteps && ladderSteps.length > 0
  ? `La mamá ha personalizado su escalera así:\n${ladderSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
  : `1. Shh desde donde estás\n2. Pararte al lado\n3. Mano en el pecho\n4. Palmaditas\n5. Caricias\n6. Mejilla con mejilla\n7. Cargar para calmar`}
Siempre de MENOS a MÁS. Solo escalar si el nivel anterior no funcionó.

RUTINA NOCTURNA — explicar SIEMPRE paso a paso:
Leche/pecho → Baño relajante → Pijama → Cuento o canción → Ceremonia de adiós a los peluches → A dormir
La ceremonia de peluches: colocar 2-3 peluches en el cuarto (no en la cuna). Al finalizar la rutina decirles buenas noches a cada uno por nombre: "Buenas noches al osito, buenas noches al conejo..." y luego "Buenas noches a [nombre del bebé]". Esto da cierre al día y seguridad.

${paceInfo ? `RITMO ELEGIDO: ${paceInfo.icon} ${paceInfo.label} — ${paceInfo.detail} Avanzar cada ${paceInfo.chairDays} días.` : ""}

SIESTAS: Entrenar nocturno PRIMERO. Luego primera siesta, luego segunda. NUNCA entrenar la tercera siesta o posteriores — son siestas puente/de tránsito.

REGRESIONES: Frenar entrenamiento, acompañar, NO nuevas asociaciones ni retroceder mucho. Mínimo 2 semanas de estabilidad antes de empezar. Un cambio a la vez.

AMBIENTE SIEMPRE: Oscuridad total, 20-23°C, ruido blanco máx 60db. Sin pantallas 2h antes. 15min luz solar mañana.

${isToddler ? `HERRAMIENTAS TODDLER (el bebé tiene más de 18 meses, SÍ incluir):
- Rutina visual: secuencia de imágenes de la rutina nocturna
- Star chart: tabla de estrellas para medir progreso
- Retorno silencioso para despertares
- Hablarle claro y con anticipación de qué se espera` : "NO incluir herramientas de toddler — el bebé es menor de 18 meses."}

FORMATO ESTRICTO — MUY IMPORTANTE:
- NO uses markdown: sin ###, sin **, sin tablas con |, sin listas con guiones
- Escribe en texto plano con párrafos y números (1. 2. 3.)
- El primero siempre empieza: "El próximo paso es..."
- Máximo 5 pasos concretos y accionables
- Explica la rutina nocturna incluyendo la ceremonia de peluches paso a paso
- Termina con una frase corta de aliento
- Responde en español, tono cálido como amiga experta`;
};

type View = "goals" | "questions" | "ladder" | "plan";
interface LadderStep { id: string; label: string; active: boolean; custom: boolean; }

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(100,125,131,0.07)", ...style }}>{children}</div>
);
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: C.teal, marginBottom: 4 }}>{children}</div>
);
const Notice = ({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) => (
  <div style={{ borderRadius: "0 12px 12px 0", borderLeft: `3px solid ${color}`, padding: "10px 14px", marginBottom: 12, background: bg, fontSize: 12, color: "#777", lineHeight: 1.6 }}>{children}</div>
);
const PrimaryBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width: "100%", padding: 13, background: C.teal, color: "#fff", border: "none", borderRadius: 12, fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.4 : 1 }}>
    {label}
  </button>
);
const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}
    style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 8, padding: "7px 14px", fontSize: 12, color: "#888", cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, fontFamily: "'Niramit', sans-serif" }}>
    ← Volver
  </button>
);
const VideoEmbed = ({ url, title }: { url: string; title: string }) => (
  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
    <iframe src={url} frameBorder={0} allowFullScreen title={title}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: 10 }} />
  </div>
);
const VideoBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick}
    style={{ width: "100%", padding: 11, background: C.cream, border: `1px solid ${C.sage}`, borderRadius: 10, color: C.teal, fontFamily: "'Niramit', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
    ▶ {label}
  </button>
);

interface Props {
  babyName?: string;
  babyAgeMonths?: number;
  babyBirthdate?: string;
}

export default function GoalsTab({ babyName, babyAgeMonths, babyBirthdate }: Props) {
  const [view, setView]                   = useState<View>("goals");
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [selectedPace, setSelectedPace]   = useState<string>("");
  const [answers, setAnswers]             = useState<Record<string, string>>({});
  const [ladder, setLadder]               = useState<LadderStep[]>(DEFAULT_LADDER);
  const [newStep, setNewStep]             = useState("");
  const [aiPlan, setAiPlan]               = useState<string>(() => {
    try { return localStorage.getItem("nidra_last_plan") || ""; } catch { return ""; }
  });
  const [loading, setLoading]             = useState(false);
  const [showLadderVideo, setShowLadderVideo] = useState(false);

  const hasIndependent = selectedGoals.has("independent");
  const needsLadder    = Array.from(selectedGoals).some(g => TRAINING_GOALS.has(g));
  const filledAnswers  = Object.values(answers).filter(v => v.trim().length > 10).length;
  const canGoNext      = filledAnswers >= 2 && (!hasIndependent || selectedPace !== "");
  const activeLadder   = ladder.filter(s => s.active);
  const isToddler      = (babyAgeMonths ?? 0) >= 18;

  const toggleGoal = (id: string) => {
    const next = new Set(selectedGoals);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedGoals(next);
  };

  const toggleStep = (id: string) => setLadder(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const moveStep = (idx: number, dir: -1 | 1) => {
    const arr = [...ladder];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setLadder(arr);
  };
  const addCustomStep = () => {
    if (!newStep.trim()) return;
    setLadder(prev => [...prev, { id: `custom-${Date.now()}`, label: newStep.trim(), active: true, custom: true }]);
    setNewStep("");
  };
  const removeStep = (id: string) => setLadder(prev => prev.filter(s => s.id !== id));

  const handleNext = () => needsLadder ? setView("ladder") : generatePlan();

  const generatePlan = async () => {
    setView("plan");
    setLoading(true);
    setAiPlan("");
    const goalLabels = Array.from(selectedGoals).map(id => GOALS.find(g => g.id === id)?.label).filter(Boolean).join(", ");
    const paceInfo   = PACE_OPTIONS.find(p => p.id === selectedPace);
    const paceText   = paceInfo ? `\nRitmo: ${paceInfo.icon} ${paceInfo.label} — ${paceInfo.time}` : "";
    const ladderText = activeLadder.map(s => s.label);
    const ageText    = babyAgeMonths ? `\nEdad del bebé: ${babyAgeMonths} meses (${getAgeLabel(babyBirthdate || "")})` : "";
    const answersText = QUESTIONS.map((q, i) => `${i + 1}. ${q.label}\nRespuesta: ${answers[q.id] ?? "(sin respuesta)"}`).join("\n\n");
    const userMessage = `Objetivos: ${goalLabels}${paceText}${ageText}\nEscalera: ${ladderText.join(" → ")}\n\nRespuestas:\n${answersText}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(selectedPace, ladderText, babyAgeMonths, babyName),
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      const data = await res.json();
      const plan = data?.content?.[0]?.text ?? "No pude generar el plan. Intenta de nuevo.";
      setAiPlan(plan);
      try { localStorage.setItem("nidra_last_plan", plan); } catch {}
    } catch {
      setAiPlan("Hubo un error de conexión. Intenta de nuevo o habla con Nidra en el Asistente.");
    }
    setLoading(false);
  };

  const paceInfo = PACE_OPTIONS.find(p => p.id === selectedPace);

  // ── GOALS ───────────────────────────────────────────────────────────────────
  if (view === "goals") return (
    <div style={{ padding: "20px 20px 80px", fontFamily: "'Niramit', sans-serif" }}>
      {babyName && babyAgeMonths ? (
        <div style={{ background: C.cream, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.teal }}>
          🌙 Plan para <strong>{babyName}</strong> · {getAgeLabel(babyBirthdate || "")}
        </div>
      ) : (
        <div style={{ background: "#fdf8f2", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#8a6020", lineHeight: 1.5 }}>
          💡 Agrega la fecha de nacimiento de tu bebé en el perfil (👤) para obtener un plan más personalizado.
        </div>
      )}
      <Card>
        <SectionTitle>Mis objetivos</SectionTitle>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Selecciona uno o más objetivos</div>

        {GOALS.filter(g => g.id !== "toddler" || isToddler).map(g => {
          const sel = selectedGoals.has(g.id);
          return (
            <div key={g.id}>
              <div onClick={() => toggleGoal(g.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `0.5px solid ${sel ? C.teal : "#e8e8e8"}`, borderRadius: 10, cursor: "pointer", marginBottom: 8, background: sel ? "#f4f6f5" : "#fff" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${sel ? C.teal : "#ccc"}`, background: sel ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {sel && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: sel ? C.teal : "#555", fontWeight: sel ? 600 : 400, flex: 1 }}>{g.label}</span>
              </div>

              {g.id === "independent" && sel && (
                <div style={{ background: C.cream, borderRadius: 12, padding: 14, marginBottom: 8, marginTop: -4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 4 }}>¿Qué tan gradual quieres hacerlo?</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10, lineHeight: 1.5 }}>Los resultados dependen de cada bebé y de la constancia de los papás.</div>
                  {PACE_OPTIONS.map(p => (
                    <div key={p.id} onClick={() => setSelectedPace(p.id)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", border: `0.5px solid ${selectedPace === p.id ? C.teal : "#ddd"}`, borderRadius: 10, cursor: "pointer", marginBottom: 8, background: selectedPace === p.id ? "#f4f6f5" : "#fff" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${selectedPace === p.id ? C.teal : "#ccc"}`, background: selectedPace === p.id ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        {selectedPace === p.id && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: selectedPace === p.id ? C.teal : "#444" }}>{p.icon} {p.label}</div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{p.desc}</div>
                        <div style={{ fontSize: 11, color: C.olive, marginTop: 2, fontWeight: 500 }}>{p.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 8 }}>
          <PrimaryBtn label="Continuar →" onClick={() => setView("questions")} disabled={selectedGoals.size === 0} />
        </div>
      </Card>
    </div>
  );

  // ── QUESTIONS ────────────────────────────────────────────────────────────────
  if (view === "questions") return (
    <div style={{ padding: "20px 20px 80px", fontFamily: "'Niramit', sans-serif" }}>
      <BackBtn onClick={() => setView("goals")} />
      <Card>
        <SectionTitle>Cuéntame más</SectionTitle>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Entre más específica seas, más personalizado será tu plan</div>
        <div style={{ height: 4, background: C.cream, borderRadius: 2, marginBottom: 18 }}>
          <div style={{ height: 4, background: C.teal, borderRadius: 2, width: `${Math.round((filledAnswers / QUESTIONS.length) * 100)}%`, transition: "width .3s" }} />
        </div>
        {QUESTIONS.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 6, lineHeight: 1.5 }}>{i + 1}. {q.label}</div>
            <textarea rows={i === 1 ? 4 : 3} value={answers[q.id] ?? ""}
              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder={i === 1 ? "Ej: Le doy pecho hasta que se duerme completamente, lo paso a la cuna y se despierta a los 20 min..." : "Escribe aquí..."}
              style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#444", background: C.cream, fontFamily: "'Niramit', sans-serif", resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
            />
          </div>
        ))}
        {hasIndependent && !selectedPace && (
          <Notice color="#C4A882" bg="#fdf8f2">⚠️ Regresa a Objetivos y selecciona el ritmo que prefieres.</Notice>
        )}
        <PrimaryBtn label={needsLadder ? "Continuar → Escalera de intervención" : "✨ Generar mi plan personalizado"} onClick={handleNext} disabled={!canGoNext} />
      </Card>
    </div>
  );

  // ── LADDER ───────────────────────────────────────────────────────────────────
  if (view === "ladder") return (
    <div style={{ padding: "20px 20px 80px", fontFamily: "'Niramit', sans-serif" }}>
      <BackBtn onClick={() => setView("questions")} />
      <Card>
        <SectionTitle>🪜 Tu escalera de intervención</SectionTitle>
        <div style={{ fontSize: 12, color: "#777", marginBottom: 8, lineHeight: 1.6 }}>
          Esta escalera es para cuando tu bebé <strong>llora o se despierta</strong> — no para la primera dormida. Intervén siempre de <strong>menos a más</strong>, usando solo lo necesario.
        </div>
        <div style={{ fontSize: 12, color: C.olive, fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
          ⚠️ Haz este ejercicio <strong>antes</strong> de empezar cualquier entrenamiento.
        </div>
        {!showLadderVideo
          ? <VideoBtn label="Ver video explicativo de la escalera (Adri)" onClick={() => setShowLadderVideo(true)} />
          : <VideoEmbed url={LOOM_LADDER_URL} title="Escalera de intervención" />}
        <div style={{ marginTop: 16 }}>
          {ladder.map((step, i) => (
            <div key={step.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, marginBottom: 6, background: step.active ? "#fff" : "#fafafa", border: `0.5px solid ${step.active ? C.teal : "#e0e0e0"}`, opacity: step.active ? 1 : 0.55 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: step.active ? C.teal : "#ddd", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {step.active ? ladder.filter((s, j) => s.active && j <= i).length : "–"}
              </div>
              <span style={{ fontSize: 12, color: step.active ? "#444" : "#aaa", flex: 1, lineHeight: 1.4 }}>{step.label}</span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                  style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 6, width: 24, height: 24, cursor: i === 0 ? "default" : "pointer", fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => moveStep(i, 1)} disabled={i === ladder.length - 1}
                  style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 6, width: 24, height: 24, cursor: i === ladder.length - 1 ? "default" : "pointer", fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", opacity: i === ladder.length - 1 ? 0.3 : 1 }}>↓</button>
                <button onClick={() => toggleStep(step.id)}
                  style={{ background: step.active ? C.cream : "#fff", border: `0.5px solid ${step.active ? C.teal : "#ddd"}`, borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 10, color: step.active ? C.teal : "#bbb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {step.active ? "✓" : "+"}
                </button>
                {step.custom && (
                  <button onClick={() => removeStep(step.id)}
                    style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomStep()}
            placeholder="Agregar paso propio... (ej: Canción de cuna)"
            style={{ flex: 1, border: `1.5px solid ${C.sage}`, borderRadius: 8, padding: "8px 10px", fontFamily: "'Niramit', sans-serif", fontSize: 12, color: "#444", background: C.cream, outline: "none" }} />
          <button onClick={addCustomStep}
            style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: "'Niramit', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>＋</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <PrimaryBtn label="✨ Generar mi plan personalizado" onClick={generatePlan} disabled={activeLadder.length === 0} />
        </div>
      </Card>
    </div>
  );

  // ── PLAN ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "20px 20px 80px", fontFamily: "'Niramit', sans-serif" }}>
      <BackBtn onClick={() => setView(needsLadder ? "ladder" : "questions")} />

      <Notice color="#C4A882" bg="#fdf8f2">
        <strong>💛 El método Nidra — siempre con amor</strong><br />
        Este plan nunca incluye dejar llorar al bebé solo. Todo es gradual, a tu ritmo. Tú decides qué tan rápido avanzas.
      </Notice>

      <Notice color={C.olive} bg={C.cream}>
        <strong>📅 Antes de empezar</strong><br />
        Necesitas al menos <strong>2 semanas sin cambios de rutina</strong> antes de iniciar. Un cambio a la vez. Si algo inesperado ocurre, frena y busca no retroceder.
      </Notice>

      {paceInfo && (
        <div style={{ background: C.cream, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{paceInfo.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.teal }}>{paceInfo.label}</div>
            <div style={{ fontSize: 11, color: C.olive }}>{paceInfo.time} · Avanzar cada {paceInfo.chairDays} días</div>
          </div>
        </div>
      )}

      {/* Ladder summary */}
      {needsLadder && activeLadder.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Tu escalera de intervención</div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>Para despertares y re-dormidas — de menos a más.</div>
          {activeLadder.map((step, i) => (
            <div key={step.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: i < activeLadder.length - 1 ? `1px solid ${C.cream}` : "none" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.teal, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{step.label}</div>
            </div>
          ))}
          {!showLadderVideo
            ? <VideoBtn label="Ver video explicativo de la escalera" onClick={() => setShowLadderVideo(true)} />
            : <VideoEmbed url={LOOM_LADDER_URL} title="Escalera de intervención" />}
        </Card>
      )}

      {/* AI Plan */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.olive, letterSpacing: 1 }}>NIDRA ✦ — Tu plan personalizado</div>
          {aiPlan && !loading && (
            <button onClick={() => { setView("goals"); setAiPlan(""); try { localStorage.removeItem("nidra_last_plan"); } catch {} }}
              style={{ fontSize: 11, color: "#aaa", background: "none", border: "0.5px solid #ddd", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontFamily: "'Niramit', sans-serif" }}>
              Nuevo plan
            </button>
          )}
        </div>
        {loading
          ? <div style={{ color: "#aaa", fontSize: 13, letterSpacing: 4, padding: "8px 0" }}>···</div>
          : <div style={{ fontSize: 13, color: "#444", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{aiPlan}</div>}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.cream}`, fontSize: 11, color: "#bbb" }}>
          Plan generado con base en tus respuestas y el método de Adri.
        </div>
      </Card>

      {/* Chair method explanation for independent sleep */}
      {hasIndependent && paceInfo && (
        <Card>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 17, color: C.teal, marginBottom: 8 }}>
            🪑 Cómo funciona el método
          </div>
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7, marginBottom: 12 }}>
            Coloca una silla al lado de la cuna de tu bebé. Cada noche reduces un poco el contacto físico — hoy 90%, mañana 85%, pasado 80%... Cada {paceInfo.chairDays} días mueves la silla un poco más lejos hacia la puerta.
          </div>
          <img
            src="/chair_diagram.png"
            alt="Diagrama de posiciones de la silla en la habitación del bebé"
            style={{ width: "100%", borderRadius: 10, marginBottom: 8 }}
          />
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4, lineHeight: 1.5 }}>
            Quédate siempre hasta que el bebé esté dormido. No salgas mientras llora.
          </div>
        </Card>
      )}
      <Card style={{ background: C.cream, boxShadow: "none" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 10 }}>💡 Estrategias que siempre ayudan</div>
        {[
          { icon: "🌙", text: "Ambiente: oscuridad total, 20–23°C, ruido blanco máx. 60 db." },
          { icon: "✨", text: "Rutina: leche → baño → pijama → cuento → ceremonia de adiós a los peluches. Mismos pasos cada noche." },
          { icon: "🧸", text: "Objeto de apego: peluche con tu olor, no lavarlo seguido, tener dos por si se pierde." },
          { icon: "🔅", text: "Bajar la energía de la casa 60–90 min antes: luces tenues, sin pantallas, juegos calmados." },
          { icon: "☀️", text: "15 min de luz solar por la mañana regulan el reloj biológico." },
          { icon: "📵", text: "Sin pantallas 2h antes de dormir — la luz azul inhibe la melatonina." },
          { icon: "👨‍👩‍👧", text: "Papá como figura estratégica: involúcralo activamente, especialmente en destete y despertares." },
          { icon: "💤", text: "Sueño en movimiento (coche, cargador): cuenta pero no nutre — como comida chatarra, el cerebro sigue alerta." },
        ].map((tip, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: i < 7 ? `1px solid rgba(100,125,131,0.1)` : "none" }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{tip.icon}</span>
            <span style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{tip.text}</span>
          </div>
        ))}

        {/* Toddler tools ONLY if baby is 18m+ */}
        {isToddler && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid rgba(100,125,131,0.15)` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginBottom: 8 }}>🌟 Herramientas para toddlers (18m–4 años)</div>
            {[
              { icon: "📋", text: "Rutina visual: secuencia de imágenes de los pasos de la rutina nocturna." },
              { icon: "⭐", text: "Star chart: tabla de estrellas para que el niño vea su progreso cada noche." },
              { icon: "🚶", text: "Retorno silencioso: llevar de regreso sin regañar, sin interacción, en silencio." },
              { icon: "💬", text: "Hablarle claro y con anticipación de qué se espera de él." },
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: i < 3 ? `1px solid rgba(100,125,131,0.1)` : "none" }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{tip.icon}</span>
                <span style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{tip.text}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
