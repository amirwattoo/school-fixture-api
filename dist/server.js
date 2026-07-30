import { createApp } from "./app.js";
import { env } from "./config/env.js";
const app = createApp();
const server = app.listen(env.API_PORT, () => {
    console.log(`School Fixture API listening on http://localhost:${env.API_PORT}`);
});
const shutdown = (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close((error) => {
        if (error) {
            console.error("Failed to close the HTTP server", error);
            process.exit(1);
        }
        process.exit(0);
    });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
//# sourceMappingURL=server.js.map