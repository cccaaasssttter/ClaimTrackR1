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
