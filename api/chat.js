module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, system } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: system,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Anthropic HTTP error:", response.status, errBody);
      return res.status(500).json({ error: "Anthropic error " + response.status + ": " + errBody });
    }

    const data = await response.json();
    return res.status(200).json({ content: data.content });

  } catch (error) {
    console.error("Handler error:", error && error.message ? error.message : error);
    return res.status(500).json({ error: error && error.message ? error.message : "Unknown error" });
  }
};
