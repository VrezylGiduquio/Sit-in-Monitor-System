const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "login-user.html"));
});

app.use(express.static("public"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/users", require("./routes/users"));

app.listen(PORT, () => {
  console.log("Server running on http://localhost:3000");
});