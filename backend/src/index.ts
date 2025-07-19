import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post("/api/evaluate", (req, res) => {
  console.log("Received request:", req.body);
  res.json({ message: "Evaluation received", data: req.body });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
