import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: 'black', fontSize: '24px', marginBottom: '20px' }}>
        ClaimsPro - Working!
      </h1>
      <p style={{ color: 'black', fontSize: '16px', marginBottom: '15px' }}>
        The React application is now running successfully.
      </p>
      <button 
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button works!')}
      >
        Test Button
      </button>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <h3 style={{ color: 'black', fontSize: '18px', marginBottom: '10px' }}>Next Steps:</h3>
        <p style={{ color: 'black', fontSize: '14px' }}>
          Now that the basic app is working, I can restore the full ClaimsPro functionality by fixing the authentication manager issues.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
