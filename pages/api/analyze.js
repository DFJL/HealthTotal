import Anthropic from "@anthropic-ai/sdk";

// Increase body size limit to 10MB for image uploads from mobile
export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { model, max_tokens, messages, system } = req.body;
    const response = await client.messages.create({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: max_tokens || 1000,
      ...(system ? { system } : {}),
      messages,
    });
    res.status(200).json(response);
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.status(500).json({ error: err.message || "API error" });
  }
}