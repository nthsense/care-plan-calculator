import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");

  const handleEvaluate = async () => {
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: "Hello from frontend!" }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error("Error calling evaluate endpoint:", error);
      setMessage("Error connecting to backend.");
    }
  };

  return (
    <>
      <h1>Care Plan Calculator</h1>
      <div className="card">
        <button onClick={handleEvaluate}>Evaluate</button>
      </div>
      <p className="read-the-docs">{message}</p>
    </>
  );
}

export default App;
