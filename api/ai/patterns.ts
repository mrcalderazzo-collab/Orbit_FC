// Vercel serverless function — POST /api/ai/patterns.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { patterns } from "../../server/aiService";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).json(await patterns(body));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
