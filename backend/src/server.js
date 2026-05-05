import "dotenv/config";
import cors from "cors";
import express from "express";
import fyersRoutes from "./fyersRoutes.js";

const app = express();
const port = Number(process.env.PORT || 10000);
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/fyers", fyersRoutes);

app.use((error, _req, res, _next) => {
  const status = Number(error.status || 500);
  res.status(status).json({
    success: false,
    message: error.message || "Unexpected backend error.",
  });
});

app.listen(port, () => {
  console.log(`TradeScope backend listening on ${port}`);
});
