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
