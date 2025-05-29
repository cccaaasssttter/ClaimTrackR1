# ClaimsPro - Complete Source Code Export

Generated on: 2025-05-29T21:13:48.688Z

This document contains the complete source code for the ClaimsPro Progressive Web App - a construction contract and progress claims management system.

## Features
- Single admin authentication with session timeout
- Contract management with client information
- Progress claims with line items and calculations
- PDF export for assessments and invoices
- File attachments with drag-and-drop upload
- Offline functionality with IndexedDB
- PostgreSQL database integration
- PWA capabilities with service worker
- Responsive design with Tailwind CSS

## Tech Stack
- React 18 with TypeScript
- Express.js backend
- PostgreSQL with Drizzle ORM
- Tailwind CSS + shadcn/ui
- IndexedDB for offline storage
- Service Worker for PWA
- jsPDF for PDF generation

---

## client/src/App.tsx

```tsx
import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthModal } from "@/components/AuthModal";
import { ContractSidebar } from "@/components/ContractSidebar";
import { ClaimsTable } from "@/components/ClaimsTable";
import { ClaimDetailModal } from "@/components/ClaimDetailModal";
import { NewClaimModal } from "@/components/NewClaimModal";
import { useContracts } from "@/hooks/use-contracts";
import { useClaims } from "@/hooks/use-claims";
import { authManager } from "@/lib/auth";
import { initDB } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import type { Claim, Contract } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/" component={MainApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showClaimDetail, setShowClaimDetail] = useState(false);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(300);

  const { contracts, loading: contractsLoading } = useContracts();
  const { claims, loading: claimsLoading } = useClaims(selectedContractId);
  const { toast } = useToast();

  const selectedContract = contracts.find(c => c.id === selectedContractId) || null;

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDB();
        await authManager.initialize();
        
        // Auto-select first contract if available
        if (contracts.length > 0 && !selectedContractId) {
          setSelectedContractId(contracts[0].id);
        }
      } catch (error) {
        toast({
          title: "Initialization Error",
          description: "Failed to initialize application",
          variant: "destructive",
        });
      }
    };

    initializeApp();
  }, [contracts, selectedContractId, toast]);

  // Session monitoring
  useEffect(() => {
    const timer = setInterval(() => {
      if (isAuthenticated) {
        const remaining = Math.floor(authManager.getTimeRemaining() / 1000);
        setSessionTimeRemaining(remaining);
        
        if (remaining <= 0) {
          handleSessionExpiry();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // Listen for session expiry
  useEffect(() => {
    const handleSessionExpired = () => {
      handleSessionExpiry();
    };

    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "Connection Restored",
        description: "You are back online",
      });
    };

    const handleOffline = () => {
      toast({
        title: "Working Offline",
        description: "You can continue working without internet",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleSessionExpiry = () => {
    setIsAuthenticated(false);
    authManager.logout();
    toast({
      title: "Session Expired",
      description: "Please log in again",
      variant: "destructive",
    });
  };

  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    setSelectedClaim(null);
    setShowClaimDetail(false);
  };

  const handleClaimSelect = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowClaimDetail(true);
  };

  const handleNewClaim = () => {
    if (!selectedContract) {
      toast({
        title: "No Contract Selected",
        description: "Please select a contract first",
        variant: "destructive",
      });
      return;
    }
    setShowNewClaim(true);
  };

  const handleClaimCreated = (claimId: string) => {
    // Find and select the newly created claim
    const newClaim = claims.find(c => c.id === claimId);
    if (newClaim) {
      setSelectedClaim(newClaim);
      setShowClaimDetail(true);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate statistics for selected contract
  const contractStats = selectedContract ? {
    totalValue: selectedContract.contractValue,
    totalClaimed: claims.reduce((sum, claim) => sum + claim.totals.incGst, 0),
    claimsCount: claims.length,
    pendingCount: claims.filter(c => c.status === 'Draft' || c.status === 'For Assessment').length,
    progressPercentage: selectedContract.contractValue > 0 
      ? (claims.reduce((sum, claim) => sum + claim.totals.incGst, 0) / selectedContract.contractValue) * 100 
      : 0,
  } : null;

  if (!isAuthenticated) {
    return (
      <>
        <AuthModal isOpen={true} onAuthenticated={handleAuthenticated} />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <i className="fas fa-hard-hat text-6xl text-primary mb-4"></i>
            <h1 className="text-2xl font-semibold text-foreground">ClaimsPro</h1>
            <p className="text-muted-foreground">Construction Contract Management</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40 card-elevation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-hard-hat text-primary text-xl"></i>
                <h1 className="text-xl font-semibold text-foreground">ClaimsPro</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground hidden md:block">
                <i className="fas fa-clock mr-1"></i>
                <span>{formatTime(sessionTimeRemaining)}</span>
              </div>
              <button 
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Export Data"
              >
                <i className="fas fa-download"></i>
              </button>
              <button 
                onClick={handleSessionExpiry}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                title="Logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <ContractSidebar
          selectedContractId={selectedContractId}
          onContractSelect={handleContractSelect}
          onNewContract={() => {}}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Contract Header */}
          {selectedContract && (
            <div className="bg-white border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {selectedContract.name}
                  </h2>
                  <div className="flex items-center mt-1 space-x-4 text-sm text-muted-foreground">
                    <span>{selectedContract.clientInfo.name}</span>
                    <span>•</span>
                    <span className="font-mono">
                      ${selectedContract.contractValue.toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>GST: {Math.round(selectedContract.gstRate * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors">
                    <i className="fas fa-edit mr-2"></i>
                    Edit Contract
                  </button>
                  <button 
                    onClick={handleNewClaim}
                    className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    New Claim
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            {contractsLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg card-elevation p-6 animate-pulse">
                      <div className="h-12 bg-gray-200 rounded mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !selectedContract ? (
              <div className="text-center py-12">
                <i className="fas fa-file-contract text-6xl text-muted-foreground mb-4"></i>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Contract Selected
                </h3>
                <p className="text-muted-foreground">
                  Select a contract from the sidebar to view claims
                </p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                {contractStats && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg card-elevation p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <i className="fas fa-file-alt text-blue-600 dark:text-blue-400 text-xl"></i>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                          <p className="text-2xl font-semibold text-foreground">
                            {contractStats.claimsCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg card-elevation p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                            <i className="fas fa-dollar-sign text-green-600 dark:text-green-400 text-xl"></i>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-muted-foreground">Total Claimed</p>
                          <p className="text-2xl font-semibold text-foreground font-mono">
                            ${contractStats.totalClaimed.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg card-elevation p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                            <i className="fas fa-percentage text-orange-600 dark:text-orange-400 text-xl"></i>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-muted-foreground">% Complete</p>
                          <p className="text-2xl font-semibold text-foreground">
                            {contractStats.progressPercentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg card-elevation p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <i className="fas fa-clock text-purple-600 dark:text-purple-400 text-xl"></i>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-muted-foreground">Pending</p>
                          <p className="text-2xl font-semibold text-foreground">
                            {contractStats.pendingCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Claims Table */}
                <ClaimsTable
                  contractId={selectedContractId}
                  contract={selectedContract}
                  onClaimSelect={handleClaimSelect}
                  onNewClaim={handleNewClaim}
                />
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <ClaimDetailModal
        open={showClaimDetail}
        onOpenChange={setShowClaimDetail}
        claim={selectedClaim}
        contract={selectedContract}
      />

      <NewClaimModal
        open={showNewClaim}
        onOpenChange={setShowNewClaim}
        contract={selectedContract}
        onClaimCreated={handleClaimCreated}
      />

      {/* Offline Banner */}
      {!navigator.onLine && (
        <div className="fixed bottom-4 left-4 bg-accent text-accent-foreground px-4 py-2 rounded-md shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <i className="fas fa-wifi-slash"></i>
            <span className="text-sm">Working Offline</span>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

```

## client/src/main.tsx

```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

```

## client/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 210 11% 98%; /* #F5F7FA */
  --foreground: 210 11% 15%; /* #242830 */
  --muted: 210 11% 96%; /* #F1F3F4 */
  --muted-foreground: 210 6% 46%; /* #6B7280 */
  --popover: 0 0% 100%; /* #FFFFFF */
  --popover-foreground: 210 11% 15%; /* #242830 */
  --card: 0 0% 100%; /* #FFFFFF */
  --card-foreground: 210 11% 15%; /* #242830 */
  --border: 210 11% 91%; /* #E5E7EB */
  --input: 210 11% 91%; /* #E5E7EB */
  --primary: 207 90% 54%; /* #2196F3 */
  --primary-foreground: 0 0% 100%; /* #FFFFFF */
  --secondary: 210 11% 96%; /* #F1F3F4 */
  --secondary-foreground: 210 11% 15%; /* #242830 */
  --accent: 36 77% 49%; /* #FF9800 */
  --accent-foreground: 0 0% 100%; /* #FFFFFF */
  --destructive: 0 84% 60%; /* #EF4444 */
  --destructive-foreground: 0 0% 100%; /* #FFFFFF */
  --ring: 207 90% 54%; /* #2196F3 */
  --radius: 0.5rem;
  
  /* Status colors */
  --status-draft: 210 11% 91%; /* #E5E7EB */
  --status-draft-foreground: 210 11% 15%; /* #242830 */
  --status-assessment: 207 90% 94%; /* #E3F2FD */
  --status-assessment-foreground: 207 90% 35%; /* #1565C0 */
  --status-approved: 120 60% 90%; /* #DFF6DD */
  --status-approved-foreground: 120 60% 25%; /* #2E7D32 */
  --status-invoiced: 36 77% 92%; /* #FFF4CE */
  --status-invoiced-foreground: 36 77% 30%; /* #E65100 */
  --status-paid: 142 69% 88%; /* #D1FAE5 */
  --status-paid-foreground: 142 69% 25%; /* #065F46 */
}

.dark {
  --background: 210 11% 6%; /* #0F1419 */
  --foreground: 210 11% 98%; /* #F5F7FA */
  --muted: 210 11% 13%; /* #1F2937 */
  --muted-foreground: 210 6% 63%; /* #9CA3AF */
  --popover: 210 11% 6%; /* #0F1419 */
  --popover-foreground: 210 11% 98%; /* #F5F7FA */
  --card: 210 11% 6%; /* #0F1419 */
  --card-foreground: 210 11% 98%; /* #F5F7FA */
  --border: 210 11% 18%; /* #374151 */
  --input: 210 11% 18%; /* #374151 */
  --primary: 207 90% 54%; /* #2196F3 */
  --primary-foreground: 0 0% 100%; /* #FFFFFF */
  --secondary: 210 11% 13%; /* #1F2937 */
  --secondary-foreground: 210 11% 98%; /* #F5F7FA */
  --accent: 36 77% 49%; /* #FF9800 */
  --accent-foreground: 0 0% 100%; /* #FFFFFF */
  --destructive: 0 84% 60%; /* #EF4444 */
  --destructive-foreground: 0 0% 100%; /* #FFFFFF */
  --ring: 207 90% 54%; /* #2196F3 */
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .font-mono {
    font-family: 'Roboto Mono', monospace;
  }
}

@layer components {
  .card-elevation {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }
  
  .card-elevation-md {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .status-draft {
    @apply bg-gray-100 text-gray-800 border-gray-300;
  }
  
  .status-assessment {
    @apply bg-blue-100 text-blue-800 border-blue-300;
  }
  
  .status-approved {
    @apply bg-green-100 text-green-800 border-green-300;
  }
  
  .status-invoiced {
    @apply bg-orange-100 text-orange-800 border-orange-300;
  }
  
  .status-paid {
    @apply bg-emerald-100 text-emerald-800 border-emerald-300;
  }
}

```

## client/src/pages/dashboard.tsx

```tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useContracts } from '@/hooks/use-contracts';
import { useClaims } from '@/hooks/use-claims';
import { calculateContractProgress } from '@/lib/calculations';
import { exportAllData } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import type { Contract, Claim } from '@shared/schema';

export default function Dashboard() {
  const { contracts, loading: contractsLoading } = useContracts();
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load all claims across all contracts
  useEffect(() => {
    const loadAllClaims = async () => {
      if (contractsLoading || contracts.length === 0) return;
      
      try {
        setLoading(true);
        const claimsPromises = contracts.map(async (contract) => {
          const { getClaimsByContract } = await import('@/lib/db');
          return getClaimsByContract(contract.id);
        });
        
        const claimsArrays = await Promise.all(claimsPromises);
        const flatClaims = claimsArrays.flat();
        setAllClaims(flatClaims);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAllClaims();
  }, [contracts, contractsLoading, toast]);

  const handleExportData = async () => {
    try {
      const jsonData = await exportAllData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claims-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  if (loading || contractsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall statistics
  const totalContracts = contracts.length;
  const totalContractValue = contracts.reduce((sum, contract) => sum + contract.contractValue, 0);
  const totalClaimsValue = allClaims.reduce((sum, claim) => sum + claim.totals.incGst, 0);
  const totalClaims = allClaims.length;
  const pendingClaims = allClaims.filter(claim => 
    claim.status === 'Draft' || claim.status === 'For Assessment'
  ).length;
  const overallProgress = totalContractValue > 0 ? (totalClaimsValue / totalContractValue) * 100 : 0;

  // Recent activity
  const recentClaims = allClaims
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Contract progress data
  const contractProgressData = contracts.map(contract => {
    const contractClaims = allClaims.filter(claim => claim.contractId === contract.id);
    const totalClaimed = contractClaims.reduce((sum, claim) => sum + claim.totals.incGst, 0);
    const progress = contract.contractValue > 0 ? (totalClaimed / contract.contractValue) * 100 : 0;
    
    return {
      ...contract,
      totalClaimed,
      progress,
      claimsCount: contractClaims.length,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'text-gray-600';
      case 'For Assessment': return 'text-blue-600';
      case 'Approved': return 'text-green-600';
      case 'Invoiced': return 'text-orange-600';
      case 'Paid': return 'text-emerald-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Overview of your construction contracts and progress claims
              </p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleExportData} variant="outline">
                <i className="fas fa-download mr-2"></i>
                Export Data
              </Button>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                New Contract
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
              <i className="fas fa-file-contract text-blue-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContracts}</div>
              <p className="text-xs text-muted-foreground">
                Active construction projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
              <i className="fas fa-dollar-sign text-green-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                ${totalContractValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total project value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claims Submitted</CardTitle>
              <i className="fas fa-file-invoice text-purple-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClaims}</div>
              <p className="text-xs text-muted-foreground">
                {pendingClaims} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <i className="fas fa-chart-line text-orange-600"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                ${totalClaimsValue.toLocaleString()} claimed
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contract Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Progress</CardTitle>
              <CardDescription>
                Progress overview for all active contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contractProgressData.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-folder-open text-gray-400 text-3xl mb-3"></i>
                  <p className="text-gray-500">No contracts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contractProgressData.map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{contract.name}</h4>
                        <p className="text-sm text-muted-foreground">{contract.clientInfo.name}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{contract.progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(contract.progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium font-mono">
                          ${contract.totalClaimed.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contract.claimsCount} claims
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>
                Latest progress claims across all contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentClaims.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-file-alt text-gray-400 text-3xl mb-3"></i>
                  <p className="text-gray-500">No claims yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentClaims.map((claim) => {
                    const contract = contracts.find(c => c.id === claim.contractId);
                    return (
                      <div key={claim.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium font-mono">
                              #{claim.number.toString().padStart(3, '0')}
                            </span>
                            <span className={`text-sm ${getStatusColor(claim.status)}`}>
                              {claim.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contract?.name || 'Unknown Contract'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(claim.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium font-mono">
                            ${claim.totals.incGst.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <i className="fas fa-file-contract text-2xl text-blue-600"></i>
                <span>New Contract</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <i className="fas fa-file-plus text-2xl text-green-600"></i>
                <span>New Claim</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2" onClick={handleExportData}>
                <i className="fas fa-download text-2xl text-purple-600"></i>
                <span>Export Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

```

## client/src/pages/not-found.tsx

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

```

## client/src/components/AuthModal.tsx

```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authManager } from '@/lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
}

export function AuthModal({ isOpen, onAuthenticated }: AuthModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      const remaining = Math.floor(authManager.getTimeRemaining() / 1000);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    try {
      const success = await authManager.authenticate(password);
      if (success) {
        setPassword('');
        onAuthenticated();
        toast({
          title: "Welcome",
          description: "Successfully authenticated",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Authentication error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-2xl text-primary"></i>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Admin Access Required</h2>
          <p className="text-gray-600 mt-2">Enter your admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="pr-10"
                disabled={loading}
                autoFocus
              />
              <i className="fas fa-lock absolute right-3 top-3 text-gray-400"></i>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
            {loading ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Authenticating...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>
                Access Dashboard
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-sm text-gray-500">
            <i className="fas fa-clock mr-1"></i>
            Auto-lock after 5 minutes of inactivity
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```

## client/src/components/ContractSidebar.tsx

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContracts } from '@/hooks/use-contracts';
import { NewContractModal } from './NewContractModal';
import type { Contract } from '@shared/schema';

interface ContractSidebarProps {
  selectedContractId?: string;
  onContractSelect: (contractId: string) => void;
  onNewContract: () => void;
}

export function ContractSidebar({ 
  selectedContractId, 
  onContractSelect, 
  onNewContract 
}: ContractSidebarProps) {
  const { contracts, loading } = useContracts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Filter contracts based on search
  const filteredContracts = contracts.filter(contract =>
    contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.clientInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewContract = () => {
    setShowNewModal(true);
    onNewContract();
  };

  return (
    <>
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ClaimsPro</h1>
              <p className="text-sm text-gray-500">Construction PWA</p>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                title={isOnline ? 'Online' : 'Offline'}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <i className="fas fa-cog text-gray-400"></i>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
            <Input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            variant="secondary" 
            className="w-full justify-start text-primary bg-primary/10 hover:bg-primary/20"
          >
            <i className="fas fa-file-contract mr-3"></i>
            Contracts
            <i className="fas fa-chevron-down ml-auto"></i>
          </Button>
        </div>

        {/* Contracts List */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-folder-open text-gray-400 text-2xl mb-2"></i>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No contracts found' : 'No contracts yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  isSelected={contract.id === selectedContractId}
                  onClick={() => onContractSelect(contract.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200">
          <Button onClick={handleNewContract} className="w-full mb-2">
            <i className="fas fa-plus mr-2"></i>
            New Contract
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1">
              <i className="fas fa-download mr-1"></i>
              Export
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <i className="fas fa-cog mr-1"></i>
              Settings
            </Button>
          </div>
        </div>
      </div>

      <NewContractModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
      />
    </>
  );
}

interface ContractCardProps {
  contract: Contract;
  isSelected: boolean;
  onClick: () => void;
}

function ContractCard({ contract, isSelected, onClick }: ContractCardProps) {
  const totalClaimed = contract.templateItems.reduce(
    (sum, item) => sum + item.previousClaim + item.thisClaim, 
    0
  );
  const progressPercentage = contract.contractValue > 0 
    ? (totalClaimed / contract.contractValue) * 100 
    : 0;

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
        isSelected 
          ? 'bg-primary/10 border border-primary/20' 
          : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium truncate transition-colors ${
            isSelected ? 'text-primary' : 'text-gray-900 group-hover:text-primary'
          }`}>
            {contract.name}
          </h4>
          <p className="text-sm text-gray-500 truncate">
            {contract.clientInfo.name}
          </p>
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-xs text-gray-400 font-mono">
              ${contract.contractValue.toLocaleString()}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-green-600">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className={`opacity-0 transition-opacity ${
          isSelected ? 'opacity-100' : 'group-hover:opacity-100'
        }`}>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
      </div>
    </div>
  );
}

```

## client/src/components/ClaimsTable.tsx

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClaims } from '@/hooks/use-claims';
import { generateAssessmentPDF, generateInvoicePDF, downloadPDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import type { Claim, Contract } from '@shared/schema';

interface ClaimsTableProps {
  contractId: string;
  contract: Contract | null;
  onClaimSelect: (claim: Claim) => void;
  onNewClaim: () => void;
}

export function ClaimsTable({ contractId, contract, onClaimSelect, onNewClaim }: ClaimsTableProps) {
  const { claims, loading } = useClaims(contractId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.number.toString().includes(searchQuery) ||
      claim.date.includes(searchQuery);
    const matchesStatus = !statusFilter || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDownloadAssessment = async (claim: Claim, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contract) return;

    try {
      const pdf = generateAssessmentPDF(claim, contract);
      downloadPDF(pdf, `Assessment_Claim_${claim.number.toString().padStart(3, '0')}.pdf`);
      toast({
        title: "Success",
        description: "Assessment PDF downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate assessment PDF",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = async (claim: Claim, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contract || claim.status !== 'Approved') return;

    try {
      const pdf = generateInvoicePDF(claim, contract);
      downloadPDF(pdf, `Invoice_Claim_${claim.number.toString().padStart(3, '0')}.pdf`);
      toast({
        title: "Success",
        description: "Invoice PDF generated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return 'fas fa-edit';
      case 'For Assessment': return 'fas fa-search';
      case 'Approved': return 'fas fa-check-circle';
      case 'Invoiced': return 'fas fa-file-invoice';
      case 'Paid': return 'fas fa-dollar-sign';
      default: return 'fas fa-file-alt';
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'Draft': return 'status-draft';
      case 'For Assessment': return 'status-assessment';
      case 'Approved': return 'status-approved';
      case 'Invoiced': return 'status-invoiced';
      case 'Paid': return 'status-paid';
      default: return 'status-draft';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg card-elevation">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Progress Claims</h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
              <Input
                type="text"
                placeholder="Search claims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="For Assessment">For Assessment</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Invoiced">Invoiced</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-20">Claim #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount (Ex GST)</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Total (Inc GST)</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClaims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <i className="fas fa-file-alt text-gray-400 text-2xl mb-2"></i>
                    <p className="text-gray-500">
                      {searchQuery || statusFilter ? 'No claims found' : 'No claims yet'}
                    </p>
                    {!searchQuery && !statusFilter && (
                      <Button onClick={onNewClaim} className="mt-2">
                        <i className="fas fa-plus mr-2"></i>
                        Create First Claim
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClaims.map((claim) => (
                <TableRow
                  key={claim.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onClaimSelect(claim)}
                >
                  <TableCell className="font-mono font-medium">
                    #{claim.number.toString().padStart(3, '0')}
                  </TableCell>
                  <TableCell>
                    {new Date(claim.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusClassName(claim.status)} border`}
                    >
                      <i className={`${getStatusIcon(claim.status)} mr-1`}></i>
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${claim.totals.exGst.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${claim.totals.gst.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    ${claim.totals.incGst.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDownloadAssessment(claim, e)}
                        title="Download Assessment"
                        className="h-8 w-8 text-primary hover:text-primary-600"
                      >
                        <i className="fas fa-file-pdf"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleGenerateInvoice(claim, e)}
                        disabled={claim.status !== 'Approved'}
                        title={claim.status === 'Approved' ? 'Generate Invoice' : 'Pending Approval'}
                        className="h-8 w-8 text-green-600 hover:text-green-700 disabled:text-gray-300"
                      >
                        <i className="fas fa-file-invoice-dollar"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClaimSelect(claim);
                        }}
                        title="Edit Claim"
                        className="h-8 w-8 text-gray-400 hover:text-gray-600"
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

```

## client/src/components/ClaimDetailModal.tsx

```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineItemEditor } from './LineItemEditor';
import { AttachmentsPanel } from './AttachmentsPanel';
import { ChangeHistory } from './ChangeHistory';
import { useClaims } from '@/hooks/use-claims';
import { generateAssessmentPDF, generateInvoicePDF, downloadPDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import type { Claim, Contract } from '@shared/schema';

interface ClaimDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: Claim | null;
  contract: Contract | null;
}

export function ClaimDetailModal({ 
  open, 
  onOpenChange, 
  claim, 
  contract 
}: ClaimDetailModalProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { updateClaim } = useClaims(contract?.id || '');
  const { toast } = useToast();

  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [claim]);

  if (!claim || !contract) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return 'fas fa-edit';
      case 'For Assessment': return 'fas fa-search';
      case 'Approved': return 'fas fa-check-circle';
      case 'Invoiced': return 'fas fa-file-invoice';
      case 'Paid': return 'fas fa-dollar-sign';
      default: return 'fas fa-file-alt';
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'Draft': return 'status-draft';
      case 'For Assessment': return 'status-assessment';
      case 'Approved': return 'status-approved';
      case 'Invoiced': return 'status-invoiced';
      case 'Paid': return 'status-paid';
      default: return 'status-draft';
    }
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      await updateClaim(claim.id, claim, 'Manual save');
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadAssessment = async () => {
    try {
      const pdf = generateAssessmentPDF(claim, contract);
      downloadPDF(pdf, `Assessment_Claim_${claim.number.toString().padStart(3, '0')}.pdf`);
      toast({
        title: "Success",
        description: "Assessment PDF downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate assessment PDF",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = async () => {
    if (claim.status !== 'Approved') return;
    
    try {
      const pdf = generateInvoicePDF(claim, contract);
      downloadPDF(pdf, `Invoice_Claim_${claim.number.toString().padStart(3, '0')}.pdf`);
      
      // Update claim status to Invoiced
      await updateClaim(claim.id, { status: 'Invoiced' }, 'Generated invoice');
      
      toast({
        title: "Success",
        description: "Invoice PDF generated and claim status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: Claim['status']) => {
    try {
      await updateClaim(
        claim.id, 
        { status: newStatus }, 
        `Status changed from ${claim.status} to ${newStatus}`
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Claim #{claim.number.toString().padStart(3, '0')} - Progress Assessment
            </h3>
            <Badge 
              variant="outline" 
              className={`${getStatusClassName(claim.status)} border text-sm`}
            >
              <i className={`${getStatusIcon(claim.status)} mr-2`}></i>
              {claim.status}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 flex items-center">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Unsaved Changes
              </span>
            )}
            
            <Button
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isSaving}
              variant={hasUnsavedChanges ? 'default' : 'outline'}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save
                </>
              )}
            </Button>
            
            <Button onClick={handleDownloadAssessment} variant="outline">
              <i className="fas fa-file-pdf mr-2"></i>
              Download Assessment
            </Button>
            
            {claim.status === 'Approved' && (
              <Button onClick={handleGenerateInvoice} className="bg-green-600 hover:bg-green-700">
                <i className="fas fa-file-invoice mr-2"></i>
                Generate Invoice
              </Button>
            )}
            
            {claim.status === 'For Assessment' && (
              <Button 
                onClick={() => handleStatusChange('Approved')}
                className="bg-green-600 hover:bg-green-700"
              >
                <i className="fas fa-check mr-2"></i>
                Mark as Approved
              </Button>
            )}
            
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Line Items */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <LineItemEditor
              claim={claim}
              contract={contract}
              onItemsChange={(items) => {
                // Update claim items and mark as changed
                claim.items = items;
                setHasUnsavedChanges(true);
              }}
            />
          </div>

          {/* Right Panel - Attachments & History */}
          <div className="w-96 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <AttachmentsPanel claimId={claim.id} />
            </div>
            
            <div className="flex-1 p-6">
              <ChangeHistory changelog={claim.changelog} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

```

## client/src/components/NewContractModal.tsx

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useContracts } from '@/hooks/use-contracts';
import { useToast } from '@/hooks/use-toast';

const contractFormSchema = z.object({
  name: z.string().min(1, 'Contract name is required'),
  contractValue: z.number().min(0, 'Contract value must be positive'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  abn: z.string().optional(),
  gstRate: z.number().min(0).max(1).default(0.1),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface NewContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewContractModal({ open, onOpenChange }: NewContractModalProps) {
  const { createContract } = useContracts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      name: '',
      contractValue: 0,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      abn: '',
      gstRate: 0.1,
    },
  });

  const onSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true);
    try {
      await createContract({
        name: data.name,
        contractValue: data.contractValue,
        clientInfo: {
          name: data.clientName,
          email: data.clientEmail || undefined,
          phone: data.clientPhone || undefined,
        },
        abn: data.abn || '',
        gstRate: data.gstRate,
        logoUrl: '',
        templateItems: [
          {
            id: crypto.randomUUID(),
            description: 'Site Preparation',
            contractValue: data.contractValue * 0.15,
            percentComplete: 0,
            previousClaim: 0,
            thisClaim: 0,
          },
          {
            id: crypto.randomUUID(),
            description: 'Foundation Work',
            contractValue: data.contractValue * 0.25,
            percentComplete: 0,
            previousClaim: 0,
            thisClaim: 0,
          },
          {
            id: crypto.randomUUID(),
            description: 'Structural Framework',
            contractValue: data.contractValue * 0.35,
            percentComplete: 0,
            previousClaim: 0,
            thisClaim: 0,
          },
          {
            id: crypto.randomUUID(),
            description: 'Finishing Work',
            contractValue: data.contractValue * 0.25,
            percentComplete: 0,
            previousClaim: 0,
            thisClaim: 0,
          },
        ],
      });

      form.reset();
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Contract created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-file-contract mr-2 text-primary"></i>
            New Contract
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contract Name *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter contract name"
                className={form.formState.errors.name ? 'border-red-500' : ''}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractValue">Contract Value *</Label>
              <Input
                id="contractValue"
                type="number"
                step="0.01"
                {...form.register('contractValue', { valueAsNumber: true })}
                placeholder="0.00"
                className={form.formState.errors.contractValue ? 'border-red-500' : ''}
              />
              {form.formState.errors.contractValue && (
                <p className="text-sm text-red-500">{form.formState.errors.contractValue.message}</p>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Client Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  {...form.register('clientName')}
                  placeholder="Client company or person name"
                  className={form.formState.errors.clientName ? 'border-red-500' : ''}
                />
                {form.formState.errors.clientName && (
                  <p className="text-sm text-red-500">{form.formState.errors.clientName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  {...form.register('clientEmail')}
                  placeholder="client@example.com"
                  className={form.formState.errors.clientEmail ? 'border-red-500' : ''}
                />
                {form.formState.errors.clientEmail && (
                  <p className="text-sm text-red-500">{form.formState.errors.clientEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  {...form.register('clientPhone')}
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  {...form.register('abn')}
                  placeholder="Australian Business Number"
                />
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstRate">GST Rate (%)</Label>
              <Input
                id="gstRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...form.register('gstRate', { 
                  valueAsNumber: true,
                  setValueAs: (value) => value / 100 
                })}
                defaultValue="10"
                placeholder="10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Create Contract
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

```

## client/src/components/NewClaimModal.tsx

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClaims } from '@/hooks/use-claims';
import { useToast } from '@/hooks/use-toast';
import type { Contract, LineItem } from '@shared/schema';

interface NewClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  onClaimCreated: (claimId: string) => void;
}

export function NewClaimModal({ 
  open, 
  onOpenChange, 
  contract, 
  onClaimCreated 
}: NewClaimModalProps) {
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [templateType, setTemplateType] = useState<'template' | 'clone' | 'blank'>('template');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createClaim, claims } = useClaims(contract?.id || '');
  const { toast } = useToast();

  const nextClaimNumber = claims.length + 1;
  const lastClaim = claims.length > 0 ? claims[claims.length - 1] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    setIsSubmitting(true);
    try {
      let items: LineItem[] = [];

      switch (templateType) {
        case 'template':
          items = contract.templateItems.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            percentComplete: 0,
            previousClaim: 0,
            thisClaim: 0,
          }));
          break;

        case 'clone':
          if (lastClaim) {
            items = lastClaim.items.map(item => ({
              ...item,
              id: crypto.randomUUID(),
              previousClaim: item.previousClaim + item.thisClaim,
              thisClaim: 0,
            }));
          } else {
            items = contract.templateItems.map(item => ({
              ...item,
              id: crypto.randomUUID(),
              percentComplete: 0,
              previousClaim: 0,
              thisClaim: 0,
            }));
          }
          break;

        case 'blank':
          items = [];
          break;
      }

      const claimId = await createClaim({
        contractId: contract.id,
        date: claimDate,
        status: 'Draft',
        items,
        totals: { exGst: 0, gst: 0, incGst: 0 },
        attachments: [],
        changelog: [],
      }, templateType);

      onClaimCreated(claimId);
      onOpenChange(false);
      
      // Reset form
      setClaimDate(new Date().toISOString().split('T')[0]);
      setTemplateType('template');

      toast({
        title: "Success",
        description: `Claim #${nextClaimNumber} created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create claim",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <i className="fas fa-file-plus mr-2 text-primary"></i>
            Create New Claim
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Claim Number */}
          <div className="space-y-2">
            <Label>Claim Number</Label>
            <Input 
              value={`#${nextClaimNumber.toString().padStart(3, '0')}`}
              readOnly 
              className="bg-gray-50 font-mono"
            />
            <p className="text-xs text-gray-500">
              Auto-generated based on previous claims
            </p>
          </div>

          {/* Claim Date */}
          <div className="space-y-2">
            <Label htmlFor="claimDate">Claim Date</Label>
            <Input
              id="claimDate"
              type="date"
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              required
            />
          </div>

          {/* Template Type */}
          <div className="space-y-4">
            <Label>Starting Point</Label>
            <RadioGroup 
              value={templateType} 
              onValueChange={(value: 'template' | 'clone' | 'blank') => setTemplateType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="template" id="template" />
                <Label htmlFor="template" className="cursor-pointer">
                  Use Contract Template
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="clone" 
                  id="clone"
                  disabled={!lastClaim}
                />
                <Label 
                  htmlFor="clone" 
                  className={`${!lastClaim ? 'text-gray-400' : 'cursor-pointer'}`}
                >
                  Clone Last Claim {lastClaim && `(#${lastClaim.number})`}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blank" id="blank" />
                <Label htmlFor="blank" className="cursor-pointer">
                  Start with Blank Claim
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Information Alert */}
          <Alert>
            <i className="fas fa-info-circle text-primary"></i>
            <AlertDescription>
              {templateType === 'template' && 
                "Items will be loaded from the contract template with 0% completion."
              }
              {templateType === 'clone' && lastClaim &&
                "Previous claim amounts will be automatically set. You can adjust percentages after creation."
              }
              {templateType === 'blank' &&
                "Start with an empty claim and add line items manually."
              }
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Create Claim
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

```

## client/src/components/LineItemEditor.tsx

```tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calculateThisClaim, calculateTotals, validatePercentageComplete } from '@/lib/calculations';
import { useToast } from '@/hooks/use-toast';
import type { Claim, Contract, LineItem } from '@shared/schema';

interface LineItemEditorProps {
  claim: Claim;
  contract: Contract;
  onItemsChange: (items: LineItem[]) => void;
}

export function LineItemEditor({ claim, contract, onItemsChange }: LineItemEditorProps) {
  const [items, setItems] = useState<LineItem[]>(claim.items);
  const [totals, setTotals] = useState(claim.totals);
  const { toast } = useToast();

  useEffect(() => {
    // Recalculate totals when items change
    const newTotals = calculateTotals(items, contract.gstRate);
    setTotals(newTotals);
    
    // Update parent with new items
    onItemsChange(items);
  }, [items, contract.gstRate, onItemsChange]);

  const handleItemChange = (itemId: string, field: keyof LineItem, value: any) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id !== itemId) return item;

        const updatedItem = { ...item, [field]: value };
        
        // Recalculate thisClaim when percentage or contract value changes
        if (field === 'percentComplete' || field === 'contractValue') {
          // Validate percentage
          if (field === 'percentComplete') {
            const validation = validatePercentageComplete(value, item.percentComplete);
            if (!validation.isValid) {
              toast({
                title: "Invalid Input",
                description: validation.warning,
                variant: "destructive",
              });
              return item; // Don't update if invalid
            }
            if (validation.warning) {
              toast({
                title: "Warning",
                description: validation.warning,
                variant: "destructive",
              });
            }
          }
          
          updatedItem.thisClaim = calculateThisClaim(updatedItem);
        }
        
        return updatedItem;
      });
    });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      contractValue: 0,
      percentComplete: 0,
      previousClaim: 0,
      thisClaim: 0,
    };
    
    setItems(prevItems => [...prevItems, newItem]);
  };

  const removeLineItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">Line Items</h4>
          <Button onClick={addLineItem} size="sm">
            <i className="fas fa-plus mr-2"></i>
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0">
            <TableRow>
              <TableHead className="w-[300px]">Description</TableHead>
              <TableHead className="w-[130px]">Contract Value</TableHead>
              <TableHead className="w-[100px]">% Complete</TableHead>
              <TableHead className="w-[130px]">Previous Claims</TableHead>
              <TableHead className="w-[130px]">This Claim</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <i className="fas fa-list text-gray-400 text-2xl mb-2"></i>
                    <p className="text-gray-500">No line items yet</p>
                    <Button onClick={addLineItem} className="mt-2" size="sm">
                      <i className="fas fa-plus mr-2"></i>
                      Add First Item
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="Enter description"
                      className="border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.contractValue}
                      onChange={(e) => handleItemChange(item.id, 'contractValue', parseFloat(e.target.value) || 0)}
                      className="text-right font-mono border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.percentComplete}
                        onChange={(e) => handleItemChange(item.id, 'percentComplete', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right font-mono text-gray-600">
                    {formatCurrency(item.previousClaim)}
                  </TableCell>
                  
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(item.thisClaim)}
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-800"
                      title="Remove Item"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals Section */}
      <div className="border-t border-gray-200 bg-gray-50 p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <Label className="text-sm font-medium text-gray-500">Amount (Ex GST)</Label>
            <p className="text-2xl font-mono font-semibold text-gray-900 mt-1">
              {formatCurrency(totals.exGst)}
            </p>
          </div>
          <div className="text-center">
            <Label className="text-sm font-medium text-gray-500">
              GST ({Math.round(contract.gstRate * 100)}%)
            </Label>
            <p className="text-2xl font-mono font-semibold text-gray-900 mt-1">
              {formatCurrency(totals.gst)}
            </p>
          </div>
          <div className="text-center">
            <Label className="text-sm font-medium text-gray-500">Total (Inc GST)</Label>
            <p className="text-2xl font-mono font-semibold text-primary mt-1">
              {formatCurrency(totals.incGst)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

```

## client/src/components/AttachmentsPanel.tsx

```tsx
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAttachments } from '@/hooks/use-attachments';
import { useToast } from '@/hooks/use-toast';

interface AttachmentsPanelProps {
  claimId: string;
}

export function AttachmentsPanel({ claimId }: AttachmentsPanelProps) {
  const { attachments, loading, uploading, uploadFiles, downloadAttachment, removeAttachment } = useAttachments(claimId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'fas fa-file-image text-blue-500';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf text-red-500';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel text-green-500';
    if (mimeType.includes('word')) return 'fas fa-file-word text-blue-600';
    return 'fas fa-file text-gray-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Attachments</h4>
        <Button onClick={handleFileSelect} size="sm" disabled={uploading}>
          {uploading ? (
            <>
              <i className="fas fa-spinner animate-spin mr-2"></i>
              Uploading...
            </>
          ) : (
            <>
              <i className="fas fa-plus mr-2"></i>
              Upload
            </>
          )}
        </Button>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
      />

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploading ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or click to browse
        </p>
        <Button variant="link" onClick={handleFileSelect} className="text-primary">
          Choose Files
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Max file size: 10MB
        </p>
      </div>

      {/* Attachments List */}
      <ScrollArea className="h-64">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-3">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-paperclip text-gray-400 text-2xl mb-2"></i>
            <p className="text-gray-500 text-sm">No attachments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center p-3 bg-gray-50 rounded-lg group">
                <div className="flex-shrink-0">
                  <i className={`${getFileIcon(attachment.mimeType)} text-xl`}></i>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.blob.size)}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadAttachment(attachment)}
                      className="h-8 w-8 text-gray-400 hover:text-primary"
                      title="Download"
                    >
                      <i className="fas fa-download"></i>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(attachment.id)}
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

```

## client/src/components/ChangeHistory.tsx

```tsx
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ClaimChange } from '@shared/schema';

interface ChangeHistoryProps {
  changelog: ClaimChange[];
}

export function ChangeHistory({ changelog }: ChangeHistoryProps) {
  const getChangeIcon = (fieldChanged: string) => {
    if (fieldChanged.includes('status')) return 'fas fa-exchange-alt text-orange-600';
    if (fieldChanged.includes('attachment')) return 'fas fa-paperclip text-green-600';
    if (fieldChanged.includes('item') || fieldChanged.includes('percentage')) return 'fas fa-edit text-blue-600';
    return 'fas fa-clock text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const getChangeDescription = (change: ClaimChange) => {
    if (change.fieldChanged === 'status') {
      return `Status changed from ${change.oldValue} to ${change.newValue}`;
    }
    return change.fieldChanged;
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900">Change History</h4>

      <ScrollArea className="h-64">
        {changelog.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-history text-gray-400 text-2xl mb-2"></i>
            <p className="text-gray-500 text-sm">No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {changelog.map((change, index) => (
              <div key={index} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className={`${getChangeIcon(change.fieldChanged)} text-xs`}></i>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {getChangeDescription(change)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(change.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

```

## client/src/hooks/use-contracts.ts

```ts
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { getAllContracts, saveContract, deleteContract, getContract } from '@/lib/db';
import type { Contract, InsertContract } from '@shared/schema';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadContracts = async () => {
    try {
      setLoading(true);
      const contractsData = await getAllContracts();
      setContracts(contractsData);
      setError(null);
    } catch (err) {
      setError('Failed to load contracts');
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContract = async (contractData: InsertContract): Promise<string> => {
    try {
      const newContract: Contract = {
        ...contractData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      await saveContract(newContract);
      await loadContracts();
      
      toast({
        title: "Success",
        description: "Contract created successfully",
      });

      return newContract.id;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateContract = async (id: string, updates: Partial<Contract>): Promise<void> => {
    try {
      const existing = await getContract(id);
      if (!existing) throw new Error('Contract not found');

      const updatedContract = { ...existing, ...updates };
      await saveContract(updatedContract);
      await loadContracts();

      toast({
        title: "Success",
        description: "Contract updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      });
      throw err;
    }
  };

  const removeContract = async (id: string): Promise<void> => {
    try {
      await deleteContract(id);
      await loadContracts();

      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  return {
    contracts,
    loading,
    error,
    createContract,
    updateContract,
    removeContract,
    refreshContracts: loadContracts,
  };
}

```

## client/src/hooks/use-claims.ts

```ts
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { 
  getClaimsByContract, 
  saveClaim, 
  deleteClaim, 
  getClaim,
  getNextClaimNumber 
} from '@/lib/db';
import { calculateTotals, updateLineItemCalculations } from '@/lib/calculations';
import type { Claim, InsertClaim, LineItem, ClaimChange } from '@shared/schema';

export function useClaims(contractId: string) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadClaims = async () => {
    if (!contractId) return;
    
    try {
      setLoading(true);
      const claimsData = await getClaimsByContract(contractId);
      setClaims(claimsData.sort((a, b) => a.number - b.number));
      setError(null);
    } catch (err) {
      setError('Failed to load claims');
      toast({
        title: "Error",
        description: "Failed to load claims",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createClaim = async (
    claimData: Omit<InsertClaim, 'id' | 'number'>,
    templateType: 'template' | 'clone' | 'blank' = 'template'
  ): Promise<string> => {
    try {
      const nextNumber = await getNextClaimNumber(contractId);
      
      let items: LineItem[] = claimData.items;
      
      // Update previous claim amounts based on existing claims
      if (templateType === 'clone' && claims.length > 0) {
        const lastClaim = claims[claims.length - 1];
        items = items.map(item => {
          const lastItem = lastClaim.items.find(li => li.description === item.description);
          return {
            ...item,
            previousClaim: lastItem ? lastItem.previousClaim + lastItem.thisClaim : 0,
          };
        });
      }

      // Recalculate this claim amounts
      items = updateLineItemCalculations(items);
      
      const newClaim: Claim = {
        ...claimData,
        id: crypto.randomUUID(),
        number: nextNumber,
        items,
        totals: calculateTotals(items, claimData.gstRate || 0.1),
        changelog: [{
          timestamp: new Date().toISOString(),
          fieldChanged: 'status',
          oldValue: null,
          newValue: claimData.status,
        }],
      };

      await saveClaim(newClaim);
      await loadClaims();
      
      toast({
        title: "Success",
        description: `Claim #${nextNumber} created successfully`,
      });

      return newClaim.id;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create claim",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateClaim = async (
    id: string, 
    updates: Partial<Claim>,
    changeDescription?: string
  ): Promise<void> => {
    try {
      const existing = await getClaim(id);
      if (!existing) throw new Error('Claim not found');

      // Track changes for changelog
      const changelog: ClaimChange[] = [...existing.changelog];
      
      if (changeDescription) {
        changelog.push({
          timestamp: new Date().toISOString(),
          fieldChanged: changeDescription,
          oldValue: null,
          newValue: null,
        });
      }

      // If items are updated, recalculate totals
      let updatedClaim = { ...existing, ...updates };
      
      if (updates.items) {
        updatedClaim.items = updateLineItemCalculations(updates.items);
        updatedClaim.totals = calculateTotals(updatedClaim.items, 0.1);
      }

      updatedClaim.changelog = changelog;
      
      await saveClaim(updatedClaim);
      await loadClaims();

      toast({
        title: "Success",
        description: "Claim updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update claim",
        variant: "destructive",
      });
      throw err;
    }
  };

  const removeClaim = async (id: string): Promise<void> => {
    try {
      await deleteClaim(id);
      await loadClaims();

      toast({
        title: "Success",
        description: "Claim deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete claim",
        variant: "destructive",
      });
      throw err;
    }
  };

  const duplicateClaim = async (sourceId: string): Promise<string> => {
    try {
      const sourceClaim = await getClaim(sourceId);
      if (!sourceClaim) throw new Error('Source claim not found');

      return await createClaim({
        contractId: sourceClaim.contractId,
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        items: sourceClaim.items.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          previousClaim: item.previousClaim + item.thisClaim,
          thisClaim: 0,
        })),
        totals: { exGst: 0, gst: 0, incGst: 0 },
        attachments: [],
        changelog: [],
      }, 'clone');
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to duplicate claim",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    loadClaims();
  }, [contractId]);

  return {
    claims,
    loading,
    error,
    createClaim,
    updateClaim,
    removeClaim,
    duplicateClaim,
    refreshClaims: loadClaims,
  };
}

```

## client/src/hooks/use-attachments.ts

```ts
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { 
  getAttachmentsByClaimId, 
  saveAttachment, 
  deleteAttachment 
} from '@/lib/db';
import type { Attachment } from '@shared/schema';

export function useAttachments(claimId: string) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const loadAttachments = async () => {
    if (!claimId) return;
    
    try {
      setLoading(true);
      const attachmentsData = await getAttachmentsByClaimId(claimId);
      setAttachments(attachmentsData);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files: FileList): Promise<void> => {
    if (!files.length) return;

    try {
      setUploading(true);
      
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Error",
            description: `File ${file.name} is too large (max 10MB)`,
            variant: "destructive",
          });
          continue;
        }

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          claimId,
          fileName: file.name,
          mimeType: file.type,
          blob: file,
        };

        await saveAttachment(attachment);
      }

      await loadAttachments();
      
      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = (attachment: Attachment): void => {
    try {
      const url = URL.createObjectURL(attachment.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const removeAttachment = async (id: string): Promise<void> => {
    try {
      await deleteAttachment(id);
      await loadAttachments();
      
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [claimId]);

  return {
    attachments,
    loading,
    uploading,
    uploadFiles,
    downloadAttachment,
    removeAttachment,
    refreshAttachments: loadAttachments,
  };
}

```

## client/src/hooks/use-toast.ts

```ts
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```

## client/src/hooks/use-mobile.tsx

```tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

```

## client/src/lib/auth.ts

```ts
import bcryptjs from 'bcryptjs';
import { getSettings, saveSettings } from './db';
import type { Settings } from '@shared/schema';

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const ADMIN_PASSWORD_ENV = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export class AuthManager {
  private sessionTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isAuthenticated: boolean = false;

  async initialize(): Promise<void> {
    // Check if admin password is set, if not create default
    let settings = await getSettings();
    if (!settings) {
      const defaultPasswordHash = await bcryptjs.hash(ADMIN_PASSWORD_ENV, 12);
      settings = {
        companyName: '',
        companyAbn: '',
        defaultGstRate: 0.1,
        adminPasswordHash: defaultPasswordHash,
        sessionTimeout: SESSION_TIMEOUT,
      };
      await saveSettings(settings);
    }

    // Start session monitoring
    this.startSessionMonitoring();
  }

  async authenticate(password: string): Promise<boolean> {
    const settings = await getSettings();
    if (!settings) return false;

    const isValid = await bcryptjs.compare(password, settings.adminPasswordHash);
    if (isValid) {
      this.isAuthenticated = true;
      this.updateActivity();
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated = false;
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
    this.resetSessionTimer();
  }

  private startSessionMonitoring(): void {
    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        if (this.isAuthenticated) {
          this.updateActivity();
        }
      }, true);
    });
  }

  private resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      this.logout();
      // Dispatch custom event for session expiry
      window.dispatchEvent(new CustomEvent('sessionExpired'));
    }, SESSION_TIMEOUT);
  }

  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }

  getTimeRemaining(): number {
    if (!this.isAuthenticated) return 0;
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, SESSION_TIMEOUT - elapsed);
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const settings = await getSettings();
    if (!settings) return false;

    const isCurrentValid = await bcryptjs.compare(currentPassword, settings.adminPasswordHash);
    if (!isCurrentValid) return false;

    const newPasswordHash = await bcryptjs.hash(newPassword, 12);
    await saveSettings({
      ...settings,
      adminPasswordHash: newPasswordHash,
    });

    return true;
  }
}

export const authManager = new AuthManager();

```

## client/src/lib/calculations.ts

```ts
import type { LineItem, Claim } from '@shared/schema';

export function calculateThisClaim(item: LineItem): number {
  const totalEarned = item.contractValue * (item.percentComplete / 100);
  const thisClaim = Math.max(0, totalEarned - item.previousClaim);
  return Math.round(thisClaim * 100) / 100; // Round to 2 decimal places
}

export function calculateTotals(items: LineItem[], gstRate: number = 0.1): {
  exGst: number;
  gst: number;
  incGst: number;
} {
  const exGst = items.reduce((sum, item) => sum + item.thisClaim, 0);
  const gst = exGst * gstRate;
  const incGst = exGst + gst;

  return {
    exGst: Math.round(exGst * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    incGst: Math.round(incGst * 100) / 100,
  };
}

export function updateLineItemCalculations(items: LineItem[]): LineItem[] {
  return items.map(item => ({
    ...item,
    thisClaim: calculateThisClaim(item),
  }));
}

export function validatePercentageComplete(newPercent: number, previousPercent: number): {
  isValid: boolean;
  warning?: string;
} {
  if (newPercent < 0 || newPercent > 100) {
    return { isValid: false, warning: 'Percentage must be between 0 and 100' };
  }
  
  if (newPercent < previousPercent) {
    return { 
      isValid: true, 
      warning: 'Warning: Percentage complete has decreased from previous claim' 
    };
  }
  
  return { isValid: true };
}

export function calculateContractProgress(items: LineItem[]): {
  totalValue: number;
  totalClaimed: number;
  progressPercentage: number;
} {
  const totalValue = items.reduce((sum, item) => sum + item.contractValue, 0);
  const totalClaimed = items.reduce((sum, item) => sum + item.previousClaim + item.thisClaim, 0);
  const progressPercentage = totalValue > 0 ? (totalClaimed / totalValue) * 100 : 0;

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalClaimed: Math.round(totalClaimed * 100) / 100,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
  };
}

export function sanityCheck(claim: Claim, contractValue: number): string[] {
  const warnings = [];
  
  // Check if claim total is unusually small
  if (claim.totals.incGst < 100) {
    warnings.push('Claim total is less than $100');
  }
  
  // Check for percentage decreases
  claim.items.forEach((item, index) => {
    if (item.percentComplete < 0 || item.percentComplete > 100) {
      warnings.push(`Line item ${index + 1}: Invalid percentage complete`);
    }
  });
  
  // Check contract value alignment
  const totalClaimedValue = claim.items.reduce((sum, item) => 
    sum + item.previousClaim + item.thisClaim, 0
  );
  
  if (totalClaimedValue > contractValue * 1.1) {
    warnings.push('Total claimed exceeds contract value by more than 10%');
  }
  
  return warnings;
}

```

## client/src/lib/db.ts

```ts
import { openDB, type IDBPDatabase } from 'idb';
import type { Contract, Claim, Settings, Attachment } from '@shared/schema';

const DB_NAME = 'ClaimsProDB';
const DB_VERSION = 1;

interface ClaimsProDB {
  contracts: {
    key: string;
    value: Contract;
  };
  claims: {
    key: string;
    value: Claim;
  };
  settings: {
    key: string;
    value: Settings;
  };
  attachments: {
    key: string;
    value: Attachment;
  };
}

let dbInstance: IDBPDatabase<ClaimsProDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<ClaimsProDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ClaimsProDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Contracts store
      if (!db.objectStoreNames.contains('contracts')) {
        const contractStore = db.createObjectStore('contracts', { keyPath: 'id' });
        contractStore.createIndex('name', 'name');
        contractStore.createIndex('clientName', 'clientInfo.name');
      }

      // Claims store
      if (!db.objectStoreNames.contains('claims')) {
        const claimStore = db.createObjectStore('claims', { keyPath: 'id' });
        claimStore.createIndex('contractId', 'contractId');
        claimStore.createIndex('number', 'number');
        claimStore.createIndex('status', 'status');
        claimStore.createIndex('date', 'date');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Attachments store
      if (!db.objectStoreNames.contains('attachments')) {
        const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
        attachmentStore.createIndex('claimId', 'claimId');
      }
    },
  });

  return dbInstance;
}

// Contract operations
export async function getAllContracts(): Promise<Contract[]> {
  const db = await initDB();
  return db.getAll('contracts');
}

export async function getContract(id: string): Promise<Contract | undefined> {
  const db = await initDB();
  return db.get('contracts', id);
}

export async function saveContract(contract: Contract): Promise<void> {
  const db = await initDB();
  await db.put('contracts', contract);
}

export async function deleteContract(id: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['contracts', 'claims'], 'readwrite');
  
  // Delete contract
  await tx.objectStore('contracts').delete(id);
  
  // Delete all associated claims
  const claims = await tx.objectStore('claims').index('contractId').getAll(id);
  for (const claim of claims) {
    await tx.objectStore('claims').delete(claim.id);
  }
  
  await tx.done;
}

// Claim operations
export async function getClaimsByContract(contractId: string): Promise<Claim[]> {
  const db = await initDB();
  return db.getAllFromIndex('claims', 'contractId', contractId);
}

export async function getClaim(id: string): Promise<Claim | undefined> {
  const db = await initDB();
  return db.get('claims', id);
}

export async function saveClaim(claim: Claim): Promise<void> {
  const db = await initDB();
  await db.put('claims', claim);
}

export async function deleteClaim(id: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['claims', 'attachments'], 'readwrite');
  
  // Delete claim
  await tx.objectStore('claims').delete(id);
  
  // Delete all associated attachments
  const attachments = await tx.objectStore('attachments').index('claimId').getAll(id);
  for (const attachment of attachments) {
    await tx.objectStore('attachments').delete(attachment.id);
  }
  
  await tx.done;
}

export async function getNextClaimNumber(contractId: string): Promise<number> {
  const claims = await getClaimsByContract(contractId);
  const maxNumber = claims.reduce((max, claim) => Math.max(max, claim.number), 0);
  return maxNumber + 1;
}

// Settings operations
export async function getSettings(): Promise<Settings | undefined> {
  const db = await initDB();
  return db.get('settings', 'default');
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await initDB();
  await db.put('settings', { ...settings, id: 'default' } as any);
}

// Attachment operations
export async function getAttachmentsByClaimId(claimId: string): Promise<Attachment[]> {
  const db = await initDB();
  return db.getAllFromIndex('attachments', 'claimId', claimId);
}

export async function saveAttachment(attachment: Attachment): Promise<void> {
  const db = await initDB();
  await db.put('attachments', attachment);
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('attachments', id);
}

// Backup and restore
export async function exportAllData(): Promise<string> {
  const db = await initDB();
  const data = {
    contracts: await db.getAll('contracts'),
    claims: await db.getAll('claims'),
    settings: await db.getAll('settings'),
    // Note: attachments are excluded from JSON export due to blob data
    version: DB_VERSION,
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await initDB();
  
  const tx = db.transaction(['contracts', 'claims', 'settings'], 'readwrite');
  
  // Clear existing data
  await tx.objectStore('contracts').clear();
  await tx.objectStore('claims').clear();
  await tx.objectStore('settings').clear();
  
  // Import new data
  for (const contract of data.contracts || []) {
    await tx.objectStore('contracts').put(contract);
  }
  
  for (const claim of data.claims || []) {
    await tx.objectStore('claims').put(claim);
  }
  
  for (const setting of data.settings || []) {
    await tx.objectStore('settings').put(setting);
  }
  
  await tx.done;
}

```

## client/src/lib/pdf-generator.ts

```ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Claim, Contract } from '@shared/schema';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generateAssessmentPDF(claim: Claim, contract: Contract): Blob {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Progress Claim Assessment', 20, 25);
  
  doc.setFontSize(12);
  doc.text(`Claim #${claim.number.toString().padStart(3, '0')}`, 20, 35);
  doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`, 20, 42);
  doc.text(`Status: ${claim.status}`, 20, 49);
  
  // Contract information
  doc.setFontSize(14);
  doc.text('Contract Information', 20, 65);
  doc.setFontSize(10);
  doc.text(`Project: ${contract.name}`, 20, 75);
  doc.text(`Client: ${contract.clientInfo.name}`, 20, 82);
  doc.text(`Contract Value: $${contract.contractValue.toLocaleString()}`, 20, 89);
  
  // Line items table
  const tableData = claim.items.map((item, index) => [
    index + 1,
    item.description,
    `$${item.contractValue.toLocaleString()}`,
    `${item.percentComplete}%`,
    `$${item.previousClaim.toLocaleString()}`,
    `$${item.thisClaim.toLocaleString()}`,
  ]);
  
  doc.autoTable({
    startY: 100,
    head: [['#', 'Description', 'Contract Value', '% Complete', 'Previous Claims', 'This Claim']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [33, 150, 243] },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text(`Subtotal (Ex GST): $${claim.totals.exGst.toLocaleString()}`, 130, finalY);
  doc.text(`GST: $${claim.totals.gst.toLocaleString()}`, 130, finalY + 7);
  doc.setFontSize(14);
  doc.text(`Total (Inc GST): $${claim.totals.incGst.toLocaleString()}`, 130, finalY + 17);
  
  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 280);
  
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}

export function generateInvoicePDF(claim: Claim, contract: Contract): Blob {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.text('INVOICE', 20, 25);
  
  // Invoice details
  doc.setFontSize(12);
  doc.text(`Invoice #: INV-${claim.number.toString().padStart(3, '0')}`, 20, 40);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 47);
  doc.text(`Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 20, 54);
  
  // Company information (right side)
  doc.text('From:', 130, 40);
  doc.text('[Your Company Name]', 130, 47);
  doc.text(`ABN: ${contract.abn || '[ABN]'}`, 130, 54);
  
  // Client information
  doc.text('Bill To:', 20, 75);
  doc.text(contract.clientInfo.name, 20, 82);
  if (contract.clientInfo.email) {
    doc.text(contract.clientInfo.email, 20, 89);
  }
  if (contract.clientInfo.phone) {
    doc.text(contract.clientInfo.phone, 20, 96);
  }
  
  // Contract reference
  doc.text(`Re: ${contract.name}`, 20, 110);
  doc.text(`Progress Claim #${claim.number}`, 20, 117);
  
  // Line items table
  const tableData = claim.items.map((item, index) => [
    index + 1,
    item.description,
    `$${item.contractValue.toLocaleString()}`,
    `${item.percentComplete}%`,
    `$${item.thisClaim.toLocaleString()}`,
  ]);
  
  doc.autoTable({
    startY: 130,
    head: [['#', 'Description', 'Contract Value', '% Complete', 'Amount']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [33, 150, 243] },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.text(`Subtotal: $${claim.totals.exGst.toLocaleString()}`, 130, finalY);
  doc.text(`GST (${(contract.gstRate * 100)}%): $${claim.totals.gst.toLocaleString()}`, 130, finalY + 7);
  doc.setFontSize(14);
  doc.text(`TOTAL: $${claim.totals.incGst.toLocaleString()}`, 130, finalY + 17);
  
  // Payment terms
  doc.setFontSize(10);
  doc.text('Payment Terms: Net 30 days', 20, finalY + 30);
  doc.text('Please remit payment to the above address.', 20, finalY + 37);
  
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

```

## client/src/lib/queryClient.ts

```ts
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

```

## client/src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

## client/src/types/index.ts

```ts
export * from "@shared/schema";

export interface AppState {
  isAuthenticated: boolean;
  currentContractId: string | null;
  sessionTimeout: number;
  lastActivity: number;
}

export interface CalculationResult {
  thisClaim: number;
  totalEarned: number;
  remainingValue: number;
}

export interface ExportOptions {
  format: 'pdf' | 'json';
  includeAttachments?: boolean;
  claims?: string[];
}

```

## server/index.ts

```ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

```

## server/routes.ts

```ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}

```

## server/storage.ts

```ts
import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();

```

## server/db.ts

```ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

## shared/schema.ts

```ts
import { z } from "zod";

// User schema for authentication
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  passwordHash: z.string(),
});

export type User = z.infer<typeof userSchema>;
export const insertUserSchema = userSchema.omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

// Contract schema
export const contractSchema = z.object({
  id: z.string(),
  name: z.string(),
  abn: z.string(),
  clientInfo: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
  contractValue: z.number(),
  gstRate: z.number().default(0.1),
  logoUrl: z.string().optional(),
  templateItems: z.array(z.object({
    id: z.string(),
    description: z.string(),
    contractValue: z.number(),
    percentComplete: z.number().default(0),
    previousClaim: z.number().default(0),
    thisClaim: z.number().default(0),
  })),
  createdAt: z.string(),
});

// Claim schema
export const claimSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  number: z.number(),
  date: z.string(),
  status: z.enum(["Draft", "For Assessment", "Approved", "Invoiced", "Paid"]),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    contractValue: z.number(),
    percentComplete: z.number(),
    previousClaim: z.number(),
    thisClaim: z.number(),
  })),
  totals: z.object({
    exGst: z.number(),
    gst: z.number(),
    incGst: z.number(),
  }),
  attachments: z.array(z.object({
    id: z.string(),
    claimId: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    blob: z.any(), // Blob type
  })),
  changelog: z.array(z.object({
    timestamp: z.string(),
    fieldChanged: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
});

// Settings schema
export const settingsSchema = z.object({
  companyName: z.string().default(""),
  companyAbn: z.string().default(""),
  defaultGstRate: z.number().default(0.1),
  logoUrl: z.string().optional(),
  adminPasswordHash: z.string(),
  sessionTimeout: z.number().default(300000), // 5 minutes
});

export type Contract = z.infer<typeof contractSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type LineItem = Contract['templateItems'][0];
export type Attachment = Claim['attachments'][0];
export type ClaimChange = Claim['changelog'][0];
export type Settings = z.infer<typeof settingsSchema>;

export const insertContractSchema = contractSchema.omit({ id: true, createdAt: true });
export const insertClaimSchema = claimSchema.omit({ id: true });
export const insertSettingsSchema = settingsSchema.omit({});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Drizzle schema for PostgreSQL
import { pgTable, text, integer, real, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  abn: text("abn"),
  clientInfo: jsonb("client_info").notNull().$type<{
    name: string;
    email?: string;
    phone?: string;
  }>(),
  contractValue: real("contract_value").notNull(),
  gstRate: real("gst_rate").notNull().default(0.1),
  logoUrl: text("logo_url"),
  templateItems: jsonb("template_items").notNull().$type<LineItem[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claims = pgTable("claims", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().$type<"Draft" | "For Assessment" | "Approved" | "Invoiced" | "Paid">(),
  items: jsonb("items").notNull().$type<LineItem[]>(),
  totals: jsonb("totals").notNull().$type<{
    exGst: number;
    gst: number;
    incGst: number;
  }>(),
  attachments: jsonb("attachments").notNull().$type<Attachment[]>(),
  changelog: jsonb("changelog").notNull().$type<ClaimChange[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").notNull().default(""),
  companyAbn: text("company_abn").notNull().default(""),
  defaultGstRate: real("default_gst_rate").notNull().default(0.1),
  logoUrl: text("logo_url"),
  adminPasswordHash: text("admin_password_hash").notNull(),
  sessionTimeout: integer("session_timeout").notNull().default(300000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const contractsRelations = relations(contracts, ({ many }) => ({
  claims: many(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  contract: one(contracts, {
    fields: [claims.contractId],
    references: [contracts.id],
  }),
}));

```

## client/public/manifest.json

```json
{
  "name": "ClaimsPro - Construction Contract Management",
  "short_name": "ClaimsPro",
  "description": "Progressive Web App for managing construction contracts and progress claims",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F7FA",
  "theme_color": "#2196F3",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en",
  "categories": ["business", "productivity", "utilities"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Desktop view of ClaimsPro showing contract and claims management"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "375x812",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile view of ClaimsPro with responsive design"
    }
  ],
  "prefer_related_applications": false,
  "related_applications": [],
  "features": [
    "offline-support",
    "local-storage",
    "pdf-export",
    "file-handling"
  ],
  "file_handlers": [
    {
      "action": "/",
      "accept": {
        "application/json": [".json"]
      }
    }
  ],
  "share_target": {
    "action": "/",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "files": [
        {
          "name": "attachments",
          "accept": ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx"]
        }
      ]
    }
  }
}

```

## client/public/sw.js

```js
const CACHE_NAME = 'claimspro-v1';
const STATIC_CACHE = 'claimspro-static-v1';
const DATA_CACHE = 'claimspro-data-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static files');
      return cache.addAll(STATIC_FILES.map(url => new Request(url, { credentials: 'same-origin' })));
    }).catch((error) => {
      console.error('[SW] Failed to cache static files:', error);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // API requests - Network First with Cache Fallback
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      networkFirstWithCacheFallback(request, DATA_CACHE)
    );
    return;
  }
  
  // Static assets - Cache First with Network Fallback
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirstWithNetworkFallback(request, STATIC_CACHE)
    );
    return;
  }
  
  // App shell - Cache First with Network Fallback
  if (url.origin === location.origin) {
    event.respondWith(
      cacheFirstWithNetworkFallback(request, STATIC_CACHE)
    );
    return;
  }
  
  // External resources - Network First
  event.respondWith(
    networkFirstWithCacheFallback(request, CACHE_NAME)
  );
});

// Strategy: Network First with Cache Fallback
async function networkFirstWithCacheFallback(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, update cache and return response
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an API request and both network and cache failed, return offline response
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(new URL(request.url).pathname))) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This feature requires an internet connection' 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For navigation requests, return cached app shell
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Strategy: Cache First with Network Fallback
async function cacheFirstWithNetworkFallback(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Cache miss, try network
    const networkResponse = await fetch(request);
    
    // Update cache for future requests
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Both cache and network failed for:', request.url);
    
    // For navigation requests, return a basic offline page
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ClaimsPro - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                text-align: center; 
                padding: 50px; 
                background: #f5f7fa;
                color: #333;
              }
              .offline-content {
                max-width: 400px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .icon { font-size: 48px; margin-bottom: 20px; color: #2196F3; }
              h1 { margin-bottom: 10px; }
              p { color: #666; line-height: 1.5; }
              button { 
                background: #2196F3; 
                color: white; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 4px; 
                cursor: pointer;
                margin-top: 20px;
              }
              button:hover { background: #1976D2; }
            </style>
          </head>
          <body>
            <div class="offline-content">
              <div class="icon">📱</div>
              <h1>You're Offline</h1>
              <p>ClaimsPro is a Progressive Web App that works offline. However, some features may be limited without an internet connection.</p>
              <button onclick="location.reload()">Try Again</button>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Helper function to determine if a URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-claims') {
    event.waitUntil(syncClaims());
  }
});

// Sync offline changes when connection is restored
async function syncClaims() {
  try {
    // This would sync any pending changes stored in IndexedDB
    console.log('[SW] Syncing offline claims...');
    
    // Implementation would depend on how offline changes are tracked
    // For now, just log that sync is happening
    
    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Handle push notifications (if implemented in the future)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Navigate to the app
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker registered successfully');

```

## client/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>ClaimsPro - Construction Contract Management</title>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#2196F3">
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- This is a replit script which adds a banner on the top of the page when opened in development mode outside the replit environment -->
    <script type="text/javascript" src="https://replit.com/public/js/replit-dev-banner.js"></script>
  </body>
</html>

```

## package.json

```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@tanstack/react-query": "^5.60.5",
    "bcryptjs": "^3.0.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.13.1",
    "idb": "^8.0.3",
    "input-otp": "^1.4.2",
    "jspdf": "^3.0.1",
    "jspdf-autotable": "^5.0.2",
    "lucide-react": "^0.453.0",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.6",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.2.5",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1",
    "typescript": "5.6.3",
    "vite": "^5.4.14"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.8"
  }
}

```

## drizzle.config.ts

```ts
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

```

## tailwind.config.ts

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

```

## vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});

```

## tsconfig.json

```json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

```

## postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```

## components.json

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "new-york",
    "rsc": false,
    "tsx": true,
    "tailwind": {
      "config": "tailwind.config.ts",
      "css": "client/src/index.css",
      "baseColor": "neutral",
      "cssVariables": true,
      "prefix": ""
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils",
      "ui": "@/components/ui",
      "lib": "@/lib",
      "hooks": "@/hooks"
    }
}
```

---

## Installation Instructions

1. Create a new directory and copy all files to their respective paths
2. Install dependencies: `npm install`
3. Set up PostgreSQL database and update DATABASE_URL environment variable
4. Run database migration: `npm run db:push`
5. Start development server: `npm run dev`
6. Access the application at http://localhost:5000
7. Default admin password: admin123

## Environment Variables Required

- DATABASE_URL - PostgreSQL connection string
- VITE_ADMIN_PASSWORD (optional) - Custom admin password

