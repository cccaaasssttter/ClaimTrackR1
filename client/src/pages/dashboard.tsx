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
