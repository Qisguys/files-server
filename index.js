require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const webpush = require("web-push");
const bodyParser = require("body-parser");

const app = express();

// ✅ Connect Database (Ensure this runs after loading env variables)
connectDB();

// ✅ CORS Configuration (Only keep one)
app.use(
  cors({
    origin: "https://pandafiles.vercel.app", // ✅ Ensure this is your actual frontend URL
    credentials: true, // ✅ Allow cookies & authorization headers
  })
);

// ✅ Security Headers (Move this above routes)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Supports URL-encoded data
app.use("/uploads", express.static("uploads")); // ✅ Serve static files

// ✅ Routes
app.use("/files", require("./routes/fileRoutes"));
app.use("/auth", require("./routes/authRoutes"));

// ✅ Home Route
app.get("/", (req, res) => {
  res.send("Welcome to Panda Files Backend 🚀");
});

// ✅ 404 Handler (Handles unknown routes)
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const VAPID_KEYS = webpush.generateVAPIDKeys(); // Run once and save!
console.log("VAPID PUBLIC:", VAPID_KEYS.publicKey);
console.log("VAPID PRIVATE:", VAPID_KEYS.privateKey);

// Or paste here if you saved earlier
webpush.setVapidDetails(
  "mailto:test@example.com",
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

let subscriptions = [];

app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: "Subscribed successfully!" });
});

app.get("/send", async (req, res) => {
  const notificationPayload = {
    title: "🔔 Panda Files Update!",
    body: "New features just dropped. Check them out!",
    url: "https://yourdomain.com/dashboard",
  };

  const sendPromises = subscriptions.map((sub) =>
    webpush.sendNotification(sub, JSON.stringify(notificationPayload)).catch(err => {
      console.error("Send error:", err);
    })
  );

  await Promise.all(sendPromises);
  res.status(200).json({ message: "Notifications sent" });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
