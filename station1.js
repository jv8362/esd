import React, { useEffect, useState } from "react";

function Station1() {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Change to your backend's IP if not running locally
    const ws = new window.WebSocket("ws://localhost:6789");

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "sensor_data" && message.data) {
          setData(message.data);
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    ws.onerror = (err) => {
      setConnected(false);
      console.error("WebSocket error:", err);
    };

    return () => ws.close();
  }, []);

  // Helper functions for ON/OFF logic
  const irOnOff = (val) => (val > 50 ? "ON" : "OFF");      // Adjust threshold as needed
  const touchOnOff = (val) => (val === 1 ? "ON" : "OFF");  // Touch: ON if value is 1
  const groundOnOff = (val) => (val > 100 ? "ON" : "OFF"); // Adjust threshold as needed

  return (
    <div style={{ textAlign: "center", fontFamily: "Arial" }}>
      <h2>Rework Table 1</h2>
      <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>
      {data ? (
        <>
          <p>IR: {irOnOff(data.ir)} <span style={{ color: "#888" }}>({data.ir})</span></p>
          <p>Touch: {touchOnOff(data.touch)} <span style={{ color: "#888" }}>({data.touch})</span></p>
          <p>Ground: {groundOnOff(data.ground)} <span style={{ color: "#888" }}>({data.ground})</span></p>
          <p>Timestamp: {data.timestamp}</p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default Station1;