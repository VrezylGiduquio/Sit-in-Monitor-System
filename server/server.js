const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "login-user.html"));
});

app.use(express.static("public"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/users", require("./routes/users"));
app.use("/api/reservations", require("./routes/reservations"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/admin", require("./routes/adminDashboard"));
app.use("/api/software", require("./routes/software"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/rules", require("./routes/rules"));

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "The uploaded file is too large. Please choose a smaller profile photo."
    });
  }

  next(err);
});

// Keep unknown API requests in JSON format so the frontend does not try to parse HTML.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

const adminReservations = require("./routes/sitin");
app.use("/admin", adminReservations);

app.listen(PORT, () => {
  console.log("Server running on http://localhost:3000");
});
