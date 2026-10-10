import "dotenv/config";

export function readConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv))
    throw new Error("Invalid NODE_ENV");
  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be an integer from 1 to 65535");
  function httpUrl(value, name) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be an HTTP(S) URL`);
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(`${name} must be an HTTP(S) URL without credentials`);
    return url;
  }
  const origin = httpUrl(
    env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    "FRONTEND_ORIGIN",
  );
  if (origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error("FRONTEND_ORIGIN must contain only an origin");
  const target = env.SERVICE_TARGET
    ? httpUrl(env.SERVICE_TARGET, "SERVICE_TARGET")
    : null;
  if (target && (target.pathname !== "/" || target.search || target.hash))
    throw new Error("SERVICE_TARGET must contain only an origin");
  return {
    port,
    nodeEnv,
    frontendOrigin: origin.origin,
    serviceTarget: target?.origin,
  };
}
