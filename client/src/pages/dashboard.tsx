import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
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
      remaining: contract.contractValue - totalClaimed,
    };
  });

  // Analytics data
  const statusBreakdown = allClaims.reduce((acc, claim) => {
    acc[claim.status] = (acc[claim.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(statusBreakdown).map(([status, count]) => ({
    status,
    count,
    value: count,
  }));

  const monthlyClaimsData = allClaims.reduce((acc, claim) => {
    const month = new Date(claim.date).toISOString().slice(0, 7); // YYYY-MM format
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.claims += 1;
      existing.value += claim.totals.incGst;
    } else {
      acc.push({
        month,
        claims: 1,
        value: claim.totals.incGst,
        monthName: new Date(claim.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }
    return acc;
  }, [] as Array<{ month: string; claims: number; value: number; monthName: string }>)
  .sort((a, b) => a.month.localeCompare(b.month))
  .slice(-6); // Last 6 months

  const contractValueData = contractProgressData.map(contract => ({
    name: contract.name.length > 15 ? contract.name.substring(0, 15) + '...' : contract.name,
    contractValue: contract.contractValue,
    claimed: contract.totalClaimed,
    remaining: contract.remaining,
    progress: contract.progress,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Performance metrics
  const averageClaimValue = totalClaims > 0 ? totalClaimsValue / totalClaims : 0;
  const averageContractSize = totalContracts > 0 ? totalContractValue / totalContracts : 0;
  const completionRate = contractProgressData.filter(c => c.progress >= 100).length / totalContracts * 100;

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

        {/* Analytics Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claim Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Claim Status Distribution</CardTitle>
                  <CardDescription>Breakdown of claims by current status</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8">
                      <i className="fas fa-chart-pie text-gray-400 text-3xl mb-3"></i>
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contract Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Contract Progress</CardTitle>
                  <CardDescription>Individual contract completion status</CardDescription>
                </CardHeader>
                <CardContent>
                  {contractProgressData.length > 0 ? (
                    <div className="space-y-4">
                      {contractProgressData.slice(0, 5).map((contract) => (
                        <div key={contract.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{contract.name}</span>
                            <Badge variant={contract.progress >= 100 ? "default" : "secondary"}>
                              {contract.progress.toFixed(1)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(contract.progress, 100)} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>${contract.totalClaimed.toLocaleString()} claimed</span>
                            <span>{contract.claimsCount} claims</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <i className="fas fa-folder-open text-gray-400 text-3xl mb-3"></i>
                      <p className="text-gray-500">No contracts yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Claim Value</CardTitle>
                  <i className="fas fa-calculator text-blue-600"></i>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    ${averageClaimValue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per claim submitted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Contract Size</CardTitle>
                  <i className="fas fa-building text-green-600"></i>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    ${averageContractSize.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per contract
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <i className="fas fa-check-circle text-purple-600"></i>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {completionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contracts completed
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {/* Contract Value Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Value Analysis</CardTitle>
                <CardDescription>Contract values vs claims submitted</CardDescription>
              </CardHeader>
              <CardContent>
                {contractValueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={contractValueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="contractValue" fill="#8884d8" name="Contract Value" />
                      <Bar dataKey="claimed" fill="#82ca9d" name="Amount Claimed" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-chart-bar text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-500">No financial data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Detailed Progress View */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress Details</CardTitle>
                <CardDescription>Comprehensive view of all contract progress</CardDescription>
              </CardHeader>
              <CardContent>
                {contractProgressData.length > 0 ? (
                  <div className="space-y-6">
                    {contractProgressData.map((contract) => (
                      <div key={contract.id} className="p-4 border border-border rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">{contract.name}</h4>
                            <p className="text-muted-foreground">{contract.clientInfo.name}</p>
                          </div>
                          <Badge variant={contract.progress >= 100 ? "default" : "secondary"}>
                            {contract.progress >= 100 ? "Complete" : "In Progress"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Contract Value</p>
                            <p className="text-lg font-semibold font-mono">${contract.contractValue.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Amount Claimed</p>
                            <p className="text-lg font-semibold font-mono">${contract.totalClaimed.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p className="text-lg font-semibold font-mono">${contract.remaining.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress: {contract.progress.toFixed(1)}%</span>
                            <span>{contract.claimsCount} claims submitted</span>
                          </div>
                          <Progress value={Math.min(contract.progress, 100)} className="h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-tasks text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-500">No projects to track</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Monthly Claims Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Claims Activity Trend</CardTitle>
                <CardDescription>Monthly claims volume and value over time</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyClaimsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={monthlyClaimsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthName" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'value' ? `$${Number(value).toLocaleString()}` : value,
                          name === 'value' ? 'Claim Value' : 'Number of Claims'
                        ]}
                      />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="claims" 
                        stackId="1"
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        name="Claims Count"
                      />
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="value" 
                        stackId="2"
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        name="Claims Value"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-chart-line text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-500">No trend data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Claims Activity</CardTitle>
                <CardDescription>Latest progress claims across all contracts</CardDescription>
              </CardHeader>
              <CardContent>
                {recentClaims.length > 0 ? (
                  <div className="space-y-4">
                    {recentClaims.map((claim) => {
                      const contract = contracts.find(c => c.id === claim.contractId);
                      return (
                        <div key={claim.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium font-mono text-lg">
                                #{claim.number.toString().padStart(3, '0')}
                              </span>
                              <Badge variant="outline" className={getStatusColor(claim.status)}>
                                {claim.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {contract?.name || 'Unknown Contract'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(claim.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold font-mono">
                              ${claim.totals.incGst.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {claim.lineItems.length} items
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-file-alt text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
