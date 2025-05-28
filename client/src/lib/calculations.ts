import type { LineItem, Claim } from '@shared/schema';

export function calculateThisClaim(item: LineItem): number {
  const totalEarned = item.contractValue * (item.percentComplete / 100);
  const thisClaim = Math.max(0, totalEarned - item.previousClaim);
  return Math.round(thisClaim * 100) / 100; // Round to 2 decimal places
}

export function calculateTotals(items: LineItem[], gstRate: number = 0.1): {
  exGst: number;
  gst: number;
  incGst: number;
} {
  const exGst = items.reduce((sum, item) => sum + item.thisClaim, 0);
  const gst = exGst * gstRate;
  const incGst = exGst + gst;

  return {
    exGst: Math.round(exGst * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    incGst: Math.round(incGst * 100) / 100,
  };
}

export function updateLineItemCalculations(items: LineItem[]): LineItem[] {
  return items.map(item => ({
    ...item,
    thisClaim: calculateThisClaim(item),
  }));
}

export function validatePercentageComplete(newPercent: number, previousPercent: number): {
  isValid: boolean;
  warning?: string;
} {
  if (newPercent < 0 || newPercent > 100) {
    return { isValid: false, warning: 'Percentage must be between 0 and 100' };
  }
  
  if (newPercent < previousPercent) {
    return { 
      isValid: true, 
      warning: 'Warning: Percentage complete has decreased from previous claim' 
    };
  }
  
  return { isValid: true };
}

export function calculateContractProgress(items: LineItem[]): {
  totalValue: number;
  totalClaimed: number;
  progressPercentage: number;
} {
  const totalValue = items.reduce((sum, item) => sum + item.contractValue, 0);
  const totalClaimed = items.reduce((sum, item) => sum + item.previousClaim + item.thisClaim, 0);
  const progressPercentage = totalValue > 0 ? (totalClaimed / totalValue) * 100 : 0;

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalClaimed: Math.round(totalClaimed * 100) / 100,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
  };
}

export function sanityCheck(claim: Claim, contractValue: number): string[] {
  const warnings = [];
  
  // Check if claim total is unusually small
  if (claim.totals.incGst < 100) {
    warnings.push('Claim total is less than $100');
  }
  
  // Check for percentage decreases
  claim.items.forEach((item, index) => {
    if (item.percentComplete < 0 || item.percentComplete > 100) {
      warnings.push(`Line item ${index + 1}: Invalid percentage complete`);
    }
  });
  
  // Check contract value alignment
  const totalClaimedValue = claim.items.reduce((sum, item) => 
    sum + item.previousClaim + item.thisClaim, 0
  );
  
  if (totalClaimedValue > contractValue * 1.1) {
    warnings.push('Total claimed exceeds contract value by more than 10%');
  }
  
  return warnings;
}
