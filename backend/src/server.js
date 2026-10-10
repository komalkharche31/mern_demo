import { readConfig } from "./config.js";
import { createApp } from "./app.js";

const config = readConfig();
const server = createApp(config).listen(config.port, () =>
  console.log(`Gateway: http://localhost:${config.port}/api/health`),
);
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.timeout = 15_000;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
