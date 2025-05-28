import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContracts } from '@/hooks/use-contracts';
import { NewContractModal } from './NewContractModal';
import type { Contract } from '@shared/schema';

interface ContractSidebarProps {
  selectedContractId?: string;
  onContractSelect: (contractId: string) => void;
  onNewContract: () => void;
}

export function ContractSidebar({ 
  selectedContractId, 
  onContractSelect, 
  onNewContract 
}: ContractSidebarProps) {
  const { contracts, loading } = useContracts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Filter contracts based on search
  const filteredContracts = contracts.filter(contract =>
    contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.clientInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewContract = () => {
    setShowNewModal(true);
    onNewContract();
  };

  return (
    <>
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ClaimsPro</h1>
              <p className="text-sm text-gray-500">Construction PWA</p>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                title={isOnline ? 'Online' : 'Offline'}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <i className="fas fa-cog text-gray-400"></i>
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
            <Input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-gray-200">
          <Button 
            variant="secondary" 
            className="w-full justify-start text-primary bg-primary/10 hover:bg-primary/20"
          >
            <i className="fas fa-file-contract mr-3"></i>
            Contracts
            <i className="fas fa-chevron-down ml-auto"></i>
          </Button>
        </div>

        {/* Contracts List */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-folder-open text-gray-400 text-2xl mb-2"></i>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No contracts found' : 'No contracts yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  isSelected={contract.id === selectedContractId}
                  onClick={() => onContractSelect(contract.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200">
          <Button onClick={handleNewContract} className="w-full mb-2">
            <i className="fas fa-plus mr-2"></i>
            New Contract
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1">
              <i className="fas fa-download mr-1"></i>
              Export
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <i className="fas fa-cog mr-1"></i>
              Settings
            </Button>
          </div>
        </div>
      </div>

      <NewContractModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
      />
    </>
  );
}

interface ContractCardProps {
  contract: Contract;
  isSelected: boolean;
  onClick: () => void;
}

function ContractCard({ contract, isSelected, onClick }: ContractCardProps) {
  const totalClaimed = contract.templateItems.reduce(
    (sum, item) => sum + item.previousClaim + item.thisClaim, 
    0
  );
  const progressPercentage = contract.contractValue > 0 
    ? (totalClaimed / contract.contractValue) * 100 
    : 0;

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
        isSelected 
          ? 'bg-primary/10 border border-primary/20' 
          : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium truncate transition-colors ${
            isSelected ? 'text-primary' : 'text-gray-900 group-hover:text-primary'
          }`}>
            {contract.name}
          </h4>
          <p className="text-sm text-gray-500 truncate">
            {contract.clientInfo.name}
          </p>
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-xs text-gray-400 font-mono">
              ${contract.contractValue.toLocaleString()}
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-green-600">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className={`opacity-0 transition-opacity ${
          isSelected ? 'opacity-100' : 'group-hover:opacity-100'
        }`}>
          <i className="fas fa-chevron-right text-gray-400"></i>
        </div>
      </div>
    </div>
  );
}
