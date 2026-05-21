import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, system } = req.body;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system,
      messages,
    });

    return res.status(200).json({ content: response.content });
  } catch (error: any) {
    console.error("Anthropic error full:", JSON.stringify(error));
    return res.status(500).json({
      error: error.message || "Unknown error",
      status: error.status || null,
      errorType: error.error?.type || null,
    });
  }
}
