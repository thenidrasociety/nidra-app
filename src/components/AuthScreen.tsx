import React, { useState } from "react";
import { supabase } from "../supabase";

const C = {
  teal: "#647D83",
  olive: "#90967E",
  sage: "#C3CFCA",
  cream: "#EBE7E0",
};

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handle = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Por favor ingresa tu email y contraseña.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("¡Cuenta creada! Ya puedes entrar 🌙");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Email o contraseña incorrectos. Intenta de nuevo.");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Niramit', sans-serif", background: C.cream, minHeight: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Niramit:wght@300;400;600&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${C.teal} 0%, ${C.olive} 100%)`, padding: "48px 24px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 32, color: "#fff", letterSpacing: 0.5, marginBottom: 6 }}>
          The Nidra Society
        </div>
        <div style={{ fontWeight: 300, fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 2, textTransform: "uppercase" }}>
          Sueño consciente · Familias prósperas
        </div>
        <div style={{ fontSize: 40, marginTop: 24 }}>🌙</div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: "32px 24px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 24, color: C.teal, marginBottom: 6 }}>
          {mode === "login" ? "Bienvenida de vuelta" : "Crea tu cuenta"}
        </div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 28, fontWeight: 300 }}>
          {mode === "login" ? "Ingresa para ver el progreso de tu bebé" : "Empieza tu camino hacia noches tranquilas"}
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.olive, marginBottom: 6 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            onKeyDown={e => e.key === "Enter" && handle()}
            style={{ width: "100%", border: `1.5px solid ${C.sage}`, borderRadius: 10, padding: "11px 14px", fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444", background: "#fff", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.olive, marginBottom: 6 }}>Contraseña</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            onKeyDown={e => e.key === "Enter" && handle()}
            style={{ width: "100%", border: `1.5px solid ${C.sage}`, borderRadius: 10, padding: "11px 14px", fontFamily: "'Niramit', sans-serif", fontSize: 14, color: "#444", background: "#fff", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{ background: "#fdf0f0", border: "1px solid #f5c0c0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#c0392b" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#065f46" }}>
            {success}
          </div>
        )}

        {/* Button */}
        <button onClick={handle} disabled={loading}
          style={{ width: "100%", padding: 14, background: C.teal, color: "#fff", border: "none", borderRadius: 12, fontFamily: "'Niramit', sans-serif", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginBottom: 16 }}>
          {loading ? "···" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>

        {/* Toggle mode */}
        <div style={{ textAlign: "center", fontSize: 13, color: "#aaa" }}>
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
            style={{ color: C.teal, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
            {mode === "login" ? "Regístrate aquí" : "Inicia sesión"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 24px 32px", textAlign: "center", fontSize: 11, color: "#bbb" }}>
        Al continuar aceptas los términos de uso de The Nidra Society
      </div>
    </div>
  );
}
