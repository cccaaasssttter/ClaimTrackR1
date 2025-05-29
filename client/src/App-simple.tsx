import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthModal } from "@/components/AuthModal";

function SimpleApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <AuthModal isOpen={true} onAuthenticated={handleAuthenticated} />
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏗️</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">ClaimsPro</h1>
          <p className="text-gray-600">Construction Contract Management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">ClaimsPro</h1>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Welcome to ClaimsPro!
            </h2>
            <p className="text-gray-600 mb-6">
              Your construction contract and progress claims management system is ready.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create First Contract
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <SimpleApp />
    </QueryClientProvider>
  );
}

export default App;