const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const searchRoutes = require("./routes/searchRoutes");
const responseRoutes = require("./routes/responseRoutes");
const chatHistoryRoutes = require("./routes/chatHistoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const agentRoutes = require("./routes/agentRoutes");

app.use("/api", searchRoutes);
app.use("/api", responseRoutes);
app.use("/api", chatHistoryRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", agentRoutes);

const PORT = 8134;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});