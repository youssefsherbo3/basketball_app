// Vercel serverless entry point — imports the compiled Express app
// This file is intentionally plain JS so Vercel can run it without a build step.
import app from "../artifacts/api-server/dist/app.mjs";
export default app;
