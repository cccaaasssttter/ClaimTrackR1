import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calculateThisClaim, calculateTotals, validatePercentageComplete } from '@/lib/calculations';
import { useToast } from '@/hooks/use-toast';
import type { Claim, Contract, LineItem } from '@shared/schema';

interface LineItemEditorProps {
  claim: Claim;
  contract: Contract;
  onItemsChange: (items: LineItem[]) => void;
}

export function LineItemEditor({ claim, contract, onItemsChange }: LineItemEditorProps) {
  const [items, setItems] = useState<LineItem[]>(claim.items);
  const [totals, setTotals] = useState(claim.totals);
  const { toast } = useToast();

  useEffect(() => {
    // Recalculate totals when items change
    const newTotals = calculateTotals(items, contract.gstRate);
    setTotals(newTotals);
    
    // Update parent with new items
    onItemsChange(items);
  }, [items, contract.gstRate, onItemsChange]);

  const handleItemChange = (itemId: string, field: keyof LineItem, value: any) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id !== itemId) return item;

        const updatedItem = { ...item, [field]: value };
        
        // Recalculate thisClaim when percentage or contract value changes
        if (field === 'percentComplete' || field === 'contractValue') {
          // Validate percentage
          if (field === 'percentComplete') {
            const validation = validatePercentageComplete(value, item.percentComplete);
            if (!validation.isValid) {
              toast({
                title: "Invalid Input",
                description: validation.warning,
                variant: "destructive",
              });
              return item; // Don't update if invalid
            }
            if (validation.warning) {
              toast({
                title: "Warning",
                description: validation.warning,
                variant: "destructive",
              });
            }
          }
          
          updatedItem.thisClaim = calculateThisClaim(updatedItem);
        }
        
        return updatedItem;
      });
    });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      contractValue: 0,
      percentComplete: 0,
      previousClaim: 0,
      thisClaim: 0,
    };
    
    setItems(prevItems => [...prevItems, newItem]);
  };

  const removeLineItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">Line Items</h4>
          <Button onClick={addLineItem} size="sm">
            <i className="fas fa-plus mr-2"></i>
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0">
            <TableRow>
              <TableHead className="w-[300px]">Description</TableHead>
              <TableHead className="w-[130px]">Contract Value</TableHead>
              <TableHead className="w-[100px]">% Complete</TableHead>
              <TableHead className="w-[130px]">Previous Claims</TableHead>
              <TableHead className="w-[130px]">This Claim</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <i className="fas fa-list text-gray-400 text-2xl mb-2"></i>
                    <p className="text-gray-500">No line items yet</p>
                    <Button onClick={addLineItem} className="mt-2" size="sm">
                      <i className="fas fa-plus mr-2"></i>
                      Add First Item
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      placeholder="Enter description"
                      className="border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.contractValue}
                      onChange={(e) => handleItemChange(item.id, 'contractValue', parseFloat(e.target.value) || 0)}
                      className="text-right font-mono border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.percentComplete}
                        onChange={(e) => handleItemChange(item.id, 'percentComplete', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center border-transparent focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right font-mono text-gray-600">
                    {formatCurrency(item.previousClaim)}
                  </TableCell>
                  
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(item.thisClaim)}
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-800"
                      title="Remove Item"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals Section */}
      <div className="border-t border-gray-200 bg-gray-50 p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <Label className="text-sm font-medium text-gray-500">Amount (Ex GST)</Label>
            <p className="text-2xl font-mono font-semibold text-gray-900 mt-1">
              {formatCurrency(totals.exGst)}
            </p>
          </div>
          <div className="text-center">
            <Label className="text-sm font-medium text-gray-500">
              GST ({Math.round(contract.gstRate * 100)}%)
            </Label>
            <p className="text-2xl font-mono font-semibold text-gray-900 mt-1">
              {formatCurrency(totals.gst)}
            </p>
          </div>
          <div className="text-center">
            <Label className="text-sm font-medium text-gray-500">Total (Inc GST)</Label>
            <p className="text-2xl font-mono font-semibold text-primary mt-1">
              {formatCurrency(totals.incGst)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
