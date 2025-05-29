function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#2196F3' }}>ClaimsPro Test</h1>
      <p>If you can see this, React is working correctly.</p>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Application Status</h2>
        <ul>
          <li>✓ React is loading</li>
          <li>✓ TypeScript is working</li>
          <li>✓ Vite development server is running</li>
        </ul>
      </div>
    </div>
  );
}

export default App;