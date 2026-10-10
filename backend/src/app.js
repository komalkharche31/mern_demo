import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { randomUUID } from "node:crypto";
import { createProxyMiddleware } from "http-proxy-middleware";

// One response shape for every error, including proxy failures.
function sendError(req, res, status, code, message) {
  if (res.headersSent) return res.end();
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { code, message, requestId: req.requestId } }));
}

export function createApp(config) {
  const app = express();
  app.disable("x-powered-by");
  // Identify and log requests before checking origins and rate limits.
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  app.use(helmet());
  morgan.token("request-id", (req) => req.requestId);
  app.use(
    morgan(":method :url :status :response-time ms id=:request-id", {
      skip: () => config.nodeEnv === "test",
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === config.frontendOrigin)
          return callback(null, true);
        const error = new Error("Origin is not allowed");
        error.status = 403;
        error.code = "ORIGIN_NOT_ALLOWED";
        callback(error);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposedHeaders: ["X-Request-Id"],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res) =>
        sendError(req, res, 429, "RATE_LIMITED", "Too many requests"),
    }),
  );
  app.get("/api/health", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      status: "ok",
      service: "api-gateway",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });
  // Mount proxies before body parsers so streamed request bodies stay intact.
  // /api/service/items is forwarded as /items when a target is configured.
  if (config.serviceTarget) {
    app.use(
      "/api/service",
      createProxyMiddleware({
        target: config.serviceTarget,
        changeOrigin: true,
        proxyTimeout: 10_000,
        timeout: 15_000,
        on: {
          error(error, req, res) {
            console.error(
              `[${req.requestId}] Upstream request failed: ${error.code ?? "UNKNOWN"}`,
            );
            sendError(req, res, 502, "UPSTREAM_UNAVAILABLE", "Upstream service is unavailable");
          },
        },
      }),
    );
  }
  // Parse bodies only for local routes; proxy bodies have already been streamed.
  app.use(express.json({ limit: "32kb" }));
  app.use(
    express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 100 }),
  );
  // Keep the fallback and error handler last.
  app.use((req, res) => sendError(req, res, 404, "NOT_FOUND", "Route not found"));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Internal server error";

    if (error.status >= 400 && error.status < 500) {
      status = error.status;
      message = error.message;
    }
    if (status === 400) {
      code = "BAD_REQUEST";
      message = "Invalid request body";
    }
    if (status === 413) {
      code = "PAYLOAD_TOO_LARGE";
      message = "Request body exceeds 32 KB";
    }
    if (error.code) code = error.code;
    if (status === 500) console.error(`[${req.requestId}]`, error);

    sendError(req, res, status, code, message);
  });
  return app;
}
