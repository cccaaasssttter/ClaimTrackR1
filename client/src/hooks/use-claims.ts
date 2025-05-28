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
