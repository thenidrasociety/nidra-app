export async function callAI(messages: {role: string, content: string}[], system: string): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system }),
    });
    const data = await res.json();
    return data?.content?.[0]?.text ?? "Lo siento, tuve un problema. Inténtalo de nuevo 🙏";
  } catch {
    return "Error de conexión. Intenta de nuevo 💙";
  }
}