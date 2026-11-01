import { defineApp } from "convex/server";
import fixture from "jive-abstract-resource-fixture/convex.config.js";

const app = defineApp();
app.use(fixture, { env: { GREETING: "Hello" } });

export default app;
