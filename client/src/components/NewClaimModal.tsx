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
