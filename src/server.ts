import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import pool from "./config/db";

const PORT = process.env.PORT || 5000;

const requiredEnvVars = ["JWT_SECRET"];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const start = async () => {
  try {
    // Fail fast if the database isn't reachable instead of starting a
    
    await pool.query("SELECT 1");
    console.log("Connected to PostgreSQL");

    app.listen(PORT, () => {
      console.log(`Inventory & Billing API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
