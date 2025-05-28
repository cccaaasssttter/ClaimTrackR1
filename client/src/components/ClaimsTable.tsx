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
