import { useState } from "react";

function SimpleApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      setAuthenticated(true);
    } else {
      alert("Wrong password");
    }
  };

  if (!authenticated) {
    return (
      <div style={{ padding: "20px", fontFamily: "Arial" }}>
        <h1>ClaimsPro Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (admin123)"
            style={{ padding: "10px", marginRight: "10px" }}
          />
          <button type="submit" style={{ padding: "10px" }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>ClaimsPro Dashboard</h1>
      <p>Application is working!</p>
      <button onClick={() => setAuthenticated(false)}>Logout</button>
    </div>
  );
}

export default SimpleApp;