import app from "./app.js";

const port = 3001;

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});