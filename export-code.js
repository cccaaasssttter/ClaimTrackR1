#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = 'claimspro-complete-source.md';

const filesToInclude = [
  // Frontend Components
  'client/src/App.tsx',
  'client/src/main.tsx',
  'client/src/index.css',
  'client/src/pages/dashboard.tsx',
  'client/src/pages/not-found.tsx',
  
  // UI Components
  'client/src/components/AuthModal.tsx',
  'client/src/components/ContractSidebar.tsx',
  'client/src/components/ClaimsTable.tsx',
  'client/src/components/ClaimDetailModal.tsx',
  'client/src/components/NewContractModal.tsx',
  'client/src/components/NewClaimModal.tsx',
  'client/src/components/LineItemEditor.tsx',
  'client/src/components/AttachmentsPanel.tsx',
  'client/src/components/ChangeHistory.tsx',
  
  // Hooks
  'client/src/hooks/use-contracts.ts',
  'client/src/hooks/use-claims.ts',
  'client/src/hooks/use-attachments.ts',
  'client/src/hooks/use-toast.ts',
  'client/src/hooks/use-mobile.tsx',
  
  // Libraries
  'client/src/lib/auth.ts',
  'client/src/lib/calculations.ts',
  'client/src/lib/db.ts',
  'client/src/lib/pdf-generator.ts',
  'client/src/lib/queryClient.ts',
  'client/src/lib/utils.ts',
  
  // Types
  'client/src/types/index.ts',
  
  // Backend
  'server/index.ts',
  'server/routes.ts',
  'server/storage.ts',
  'server/db.ts',
  
  // Shared
  'shared/schema.ts',
  
  // PWA
  'client/public/manifest.json',
  'client/public/sw.js',
  'client/index.html',
  
  // Configuration
  'package.json',
  'drizzle.config.ts',
  'tailwind.config.ts',
  'vite.config.ts',
  'tsconfig.json',
  'postcss.config.js',
  'components.json'
];

function readFileContent(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath).slice(1);
      return `## ${filePath}\n\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`;
    } else {
      return `## ${filePath}\n\n*File not found*\n\n`;
    }
  } catch (error) {
    return `## ${filePath}\n\n*Error reading file: ${error.message}*\n\n`;
  }
}

function generateCompleteSource() {
  let output = `# ClaimsPro - Complete Source Code Export\n\n`;
  output += `Generated on: ${new Date().toISOString()}\n\n`;
  output += `This document contains the complete source code for the ClaimsPro Progressive Web App - a construction contract and progress claims management system.\n\n`;
  output += `## Features\n`;
  output += `- Single admin authentication with session timeout\n`;
  output += `- Contract management with client information\n`;
  output += `- Progress claims with line items and calculations\n`;
  output += `- PDF export for assessments and invoices\n`;
  output += `- File attachments with drag-and-drop upload\n`;
  output += `- Offline functionality with IndexedDB\n`;
  output += `- PostgreSQL database integration\n`;
  output += `- PWA capabilities with service worker\n`;
  output += `- Responsive design with Tailwind CSS\n\n`;
  output += `## Tech Stack\n`;
  output += `- React 18 with TypeScript\n`;
  output += `- Express.js backend\n`;
  output += `- PostgreSQL with Drizzle ORM\n`;
  output += `- Tailwind CSS + shadcn/ui\n`;
  output += `- IndexedDB for offline storage\n`;
  output += `- Service Worker for PWA\n`;
  output += `- jsPDF for PDF generation\n\n`;
  output += `---\n\n`;

  filesToInclude.forEach(filePath => {
    console.log(`Processing: ${filePath}`);
    output += readFileContent(filePath);
  });

  output += `---\n\n`;
  output += `## Installation Instructions\n\n`;
  output += `1. Create a new directory and copy all files to their respective paths\n`;
  output += `2. Install dependencies: \`npm install\`\n`;
  output += `3. Set up PostgreSQL database and update DATABASE_URL environment variable\n`;
  output += `4. Run database migration: \`npm run db:push\`\n`;
  output += `5. Start development server: \`npm run dev\`\n`;
  output += `6. Access the application at http://localhost:5000\n`;
  output += `7. Default admin password: admin123\n\n`;
  output += `## Environment Variables Required\n\n`;
  output += `- DATABASE_URL - PostgreSQL connection string\n`;
  output += `- VITE_ADMIN_PASSWORD (optional) - Custom admin password\n\n`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`\nComplete source code exported to: ${OUTPUT_FILE}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
}

generateCompleteSource();