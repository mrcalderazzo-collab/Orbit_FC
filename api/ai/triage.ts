// Vercel serverless function — POST /api/ai/triage. Wraps the shared AI service
// (same code the Vite dev middleware uses) so a Vercel deploy gets live Claude
// triage when ANTHROPIC_API_KEY is set, and the heuristic fallback otherwise.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { triage } from "../../server/aiService";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).json(await triage(body));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
