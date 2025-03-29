require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
app.use(cors());
app.use(cors({
    origin: ["https://pandafiles.vercel.app", "https://pandafiles.vercel.app/login"], 
    credentials: true
  }));

app.use("/uploads", express.static("uploads"));


app.use(express.json());

// Connect Database
connectDB();

// Routes
app.use("/files", require("./routes/fileRoutes"));
app.use("/auth", require("./routes/authRoutes"));


app.use("/",(req,res)=>{
  res.send("welcome to panda files");
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
