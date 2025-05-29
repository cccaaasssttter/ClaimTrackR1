import { useState, useEffect } from "react";
import { Switch, Route, Link } from "wouter";
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

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const handleLogout = () => {
    authManager.logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-hard-hat text-primary text-xl"></i>
                <h1 className="text-xl font-semibold text-foreground">ClaimsPro</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Navigation Menu */}
              <nav className="flex items-center space-x-1">
                <Link 
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                  title="Dashboard Overview"
                >
                  <i className="fas fa-chart-pie mr-2"></i>
                  Dashboard
                </Link>
                <Link 
                  href="/contracts"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                  title="Manage Contracts & Claims"
                >
                  <i className="fas fa-file-contract mr-2"></i>
                  Contracts
                </Link>
              </nav>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 border-l pl-4 ml-4">
                <button 
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                  title="Export Data"
                >
                  <i className="fas fa-download"></i>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function Router() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      await initDB();
      await authManager.initialize();
      setIsAuthenticated(authManager.getAuthenticationStatus());
    };
    
    initializeAuth();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthModal 
          isOpen={true} 
          onAuthenticated={handleAuthenticated}
        />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/dashboard">
        <AuthenticatedLayout>
          <Dashboard />
        </AuthenticatedLayout>
      </Route>
      <Route path="/contracts">
        <AuthenticatedLayout>
          <MainApp />
        </AuthenticatedLayout>
      </Route>
      <Route path="/">
        <AuthenticatedLayout>
          <Dashboard />
        </AuthenticatedLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showClaimDetail, setShowClaimDetail] = useState(false);
  const [showNewClaim, setShowNewClaim] = useState(false);

  const { contracts, loading: contractsLoading } = useContracts();
  const { claims, loading: claimsLoading } = useClaims(selectedContractId);
  const { toast } = useToast();

  const selectedContract = contracts.find(c => c.id === selectedContractId) || null;

  // Auto-select first contract if available
  useEffect(() => {
    if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  const handleClaimSelect = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowClaimDetail(true);
  };

  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    setSelectedClaim(null);
    setShowClaimDetail(false);
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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <ContractSidebar
        selectedContractId={selectedContractId}
        onContractSelect={handleContractSelect}
        onNewContract={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedContract && (
          <ClaimsTable
            contractId={selectedContractId}
            contract={selectedContract}
            onClaimSelect={handleClaimSelect}
            onNewClaim={handleNewClaim}
          />
        )}
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
        onClaimCreated={(claimId) => {
          setShowNewClaim(false);
          // Find and select the new claim
          const newClaim = claims.find(c => c.id === claimId);
          if (newClaim) {
            handleClaimSelect(newClaim);
          }
        }}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;