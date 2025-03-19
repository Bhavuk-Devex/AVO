const express = require("express");
const db = require("./src/DB/db");
const userRoutes = require("./src/Routes/routes");

const app = express();
const PORT = 3000;

const cron = require("node-cron");

// Middleware
app.use(express.json()); // Allow JSON body parsing

// Test Route
app.get("/", (req, res) => {
  res.send("Welcome to Avo Backend!");
});

app.use("/Avo", userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
