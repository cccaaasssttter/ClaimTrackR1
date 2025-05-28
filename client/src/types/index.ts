export * from "@shared/schema";

export interface AppState {
  isAuthenticated: boolean;
  currentContractId: string | null;
  sessionTimeout: number;
  lastActivity: number;
}

export interface CalculationResult {
  thisClaim: number;
  totalEarned: number;
  remainingValue: number;
}

export interface ExportOptions {
  format: 'pdf' | 'json';
  includeAttachments?: boolean;
  claims?: string[];
}
