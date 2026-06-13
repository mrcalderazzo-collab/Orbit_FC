// apiPlugin.ts — mounts Orbit's AI endpoints on the Vite dev/preview server so
// the browser can call /api/ai/* without ever seeing the Anthropic key. For a
// standalone production deploy, the same handlers can be mounted on any Node
// server; this keeps the demo runnable with a single `npm run dev`.
import type { Connect, Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { classifyIntake, patterns, triage, vendorMatch } from "./aiService";

function readJSON(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(data));
}

const ROUTES: Record<string, (body: never) => Promise<unknown>> = {
  "/api/ai/triage": (b) => triage(b),
  "/api/ai/patterns": (b) => patterns(b),
  "/api/ai/vendor": (b) => vendorMatch(b),
  "/api/ai/intake": (b) => classifyIntake(b),
};

function middleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = (req.url || "").split("?")[0];
    const route = ROUTES[url];
    if (!route || req.method !== "POST") return next();
    try {
      const body = (await readJSON(req)) as never;
      const result = await route(body);
      send(res, 200, result);
    } catch (err) {
      send(res, 500, { error: (err as Error).message });
    }
  };
}

export function orbitApiPlugin(): Plugin {
  return {
    name: "orbit-ai-api",
    configureServer(server) { server.middlewares.use(middleware()); },
    configurePreviewServer(server) { server.middlewares.use(middleware()); },
  };
}
