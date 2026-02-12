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
app.use("/api", searchRoutes);
app.use("/api", responseRoutes);
app.use("/api", chatHistoryRoutes);
app.use("/api", dashboardRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});