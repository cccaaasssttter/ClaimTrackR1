import { openDB, type IDBPDatabase } from 'idb';
import type { Contract, Claim, Settings, Attachment } from '@shared/schema';

const DB_NAME = 'ClaimsProDB';
const DB_VERSION = 1;

interface ClaimsProDB {
  contracts: {
    key: string;
    value: Contract;
  };
  claims: {
    key: string;
    value: Claim;
  };
  settings: {
    key: string;
    value: Settings;
  };
  attachments: {
    key: string;
    value: Attachment;
  };
}

let dbInstance: IDBPDatabase<ClaimsProDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<ClaimsProDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ClaimsProDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Contracts store
      if (!db.objectStoreNames.contains('contracts')) {
        const contractStore = db.createObjectStore('contracts', { keyPath: 'id' });
        contractStore.createIndex('name', 'name');
        contractStore.createIndex('clientName', 'clientInfo.name');
      }

      // Claims store
      if (!db.objectStoreNames.contains('claims')) {
        const claimStore = db.createObjectStore('claims', { keyPath: 'id' });
        claimStore.createIndex('contractId', 'contractId');
        claimStore.createIndex('number', 'number');
        claimStore.createIndex('status', 'status');
        claimStore.createIndex('date', 'date');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Attachments store
      if (!db.objectStoreNames.contains('attachments')) {
        const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
        attachmentStore.createIndex('claimId', 'claimId');
      }
    },
  });

  return dbInstance;
}

// Contract operations
export async function getAllContracts(): Promise<Contract[]> {
  const db = await initDB();
  return db.getAll('contracts');
}

export async function getContract(id: string): Promise<Contract | undefined> {
  const db = await initDB();
  return db.get('contracts', id);
}

export async function saveContract(contract: Contract): Promise<void> {
  const db = await initDB();
  await db.put('contracts', contract);
}

export async function deleteContract(id: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['contracts', 'claims'], 'readwrite');
  
  // Delete contract
  await tx.objectStore('contracts').delete(id);
  
  // Delete all associated claims
  const claims = await tx.objectStore('claims').index('contractId').getAll(id);
  for (const claim of claims) {
    await tx.objectStore('claims').delete(claim.id);
  }
  
  await tx.done;
}

// Claim operations
export async function getClaimsByContract(contractId: string): Promise<Claim[]> {
  const db = await initDB();
  return db.getAllFromIndex('claims', 'contractId', contractId);
}

export async function getClaim(id: string): Promise<Claim | undefined> {
  const db = await initDB();
  return db.get('claims', id);
}

export async function saveClaim(claim: Claim): Promise<void> {
  const db = await initDB();
  await db.put('claims', claim);
}

export async function deleteClaim(id: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['claims', 'attachments'], 'readwrite');
  
  // Delete claim
  await tx.objectStore('claims').delete(id);
  
  // Delete all associated attachments
  const attachments = await tx.objectStore('attachments').index('claimId').getAll(id);
  for (const attachment of attachments) {
    await tx.objectStore('attachments').delete(attachment.id);
  }
  
  await tx.done;
}

export async function getNextClaimNumber(contractId: string): Promise<number> {
  const claims = await getClaimsByContract(contractId);
  const maxNumber = claims.reduce((max, claim) => Math.max(max, claim.number), 0);
  return maxNumber + 1;
}

// Settings operations
export async function getSettings(): Promise<Settings | undefined> {
  const db = await initDB();
  return db.get('settings', 'default');
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await initDB();
  await db.put('settings', { ...settings, id: 'default' } as any);
}

// Attachment operations
export async function getAttachmentsByClaimId(claimId: string): Promise<Attachment[]> {
  const db = await initDB();
  return db.getAllFromIndex('attachments', 'claimId', claimId);
}

export async function saveAttachment(attachment: Attachment): Promise<void> {
  const db = await initDB();
  await db.put('attachments', attachment);
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('attachments', id);
}

// Backup and restore
export async function exportAllData(): Promise<string> {
  const db = await initDB();
  const data = {
    contracts: await db.getAll('contracts'),
    claims: await db.getAll('claims'),
    settings: await db.getAll('settings'),
    // Note: attachments are excluded from JSON export due to blob data
    version: DB_VERSION,
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await initDB();
  
  const tx = db.transaction(['contracts', 'claims', 'settings'], 'readwrite');
  
  // Clear existing data
  await tx.objectStore('contracts').clear();
  await tx.objectStore('claims').clear();
  await tx.objectStore('settings').clear();
  
  // Import new data
  for (const contract of data.contracts || []) {
    await tx.objectStore('contracts').put(contract);
  }
  
  for (const claim of data.claims || []) {
    await tx.objectStore('claims').put(claim);
  }
  
  for (const setting of data.settings || []) {
    await tx.objectStore('settings').put(setting);
  }
  
  await tx.done;
}
