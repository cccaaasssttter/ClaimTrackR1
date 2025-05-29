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
import { NewContractModal } from "@/components/NewContractModal";
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
  // Temporarily bypass authentication for testing
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showClaimDetail, setShowClaimDetail] = useState(false);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(300);

  const { contracts, loading: contractsLoading } = useContracts();
  const { claims, loading: claimsLoading } = useClaims(selectedContractId);
  
  console.log("MainApp render - isAuthenticated:", isAuthenticated, "contracts:", contracts?.length);
  const { toast } = useToast();

  const selectedContract = contracts.find(c => c.id === selectedContractId) || null;

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Initializing app...");
        await initDB();
        console.log("DB initialized");
        await authManager.initialize();
        console.log("Auth manager initialized");
        
        // Auto-select first contract if available
        if (contracts.length > 0 && !selectedContractId) {
          setSelectedContractId(contracts[0].id);
        }
      } catch (error) {
        console.error("Initialization error:", error);
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
            ) : contracts.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-plus-circle text-6xl text-primary mb-4"></i>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Welcome to ClaimsPro
                </h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first construction contract
                </p>
                <button 
                  onClick={() => setShowNewContract(true)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create First Contract
                </button>
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

      <NewContractModal
        open={showNewContract}
        onOpenChange={setShowNewContract}
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
