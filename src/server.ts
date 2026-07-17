import express from "express";
import cors from "cors";
import paymentList from "./routes/payment.js";
import allMembers from "./routes/allMembers.js";
import myAccount from "./routes/myaccount.js";
import allpaymentsList from "./routes/allpayments.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

const app = express();
const port = process.env.PORT || 8000;

if (!process.env.FRONTEND_URL) {
  console.warn("⚠️ Warning: FRONTEND_URL is not defined in environment variables. Defaulting CORS settings.");
}

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigins = allowedOrigins.map(o => o.replace(/['"]/g, ""));
    
    // Dynamically match allowed origins, local hostnames, or any Vercel app domain
    if (
      cleanOrigins.includes(origin) ||
      cleanOrigins.includes("*") ||
      origin.endsWith(".vercel.app") ||
      origin.startsWith("http://localhost:")
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Server is running successfully." });
});

app.use('/api/payments', paymentList)
app.use('/api/allpayments', allpaymentsList)
app.use('/api/allMembers', allMembers)
app.use('/api/myaccount', myAccount)

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

export default app;


