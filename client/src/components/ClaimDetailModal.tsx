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
