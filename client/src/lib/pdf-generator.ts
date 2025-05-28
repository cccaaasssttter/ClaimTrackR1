import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Claim, Contract } from '@shared/schema';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function generateAssessmentPDF(claim: Claim, contract: Contract): Blob {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Progress Claim Assessment', 20, 25);
  
  doc.setFontSize(12);
  doc.text(`Claim #${claim.number.toString().padStart(3, '0')}`, 20, 35);
  doc.text(`Date: ${new Date(claim.date).toLocaleDateString()}`, 20, 42);
  doc.text(`Status: ${claim.status}`, 20, 49);
  
  // Contract information
  doc.setFontSize(14);
  doc.text('Contract Information', 20, 65);
  doc.setFontSize(10);
  doc.text(`Project: ${contract.name}`, 20, 75);
  doc.text(`Client: ${contract.clientInfo.name}`, 20, 82);
  doc.text(`Contract Value: $${contract.contractValue.toLocaleString()}`, 20, 89);
  
  // Line items table
  const tableData = claim.items.map((item, index) => [
    index + 1,
    item.description,
    `$${item.contractValue.toLocaleString()}`,
    `${item.percentComplete}%`,
    `$${item.previousClaim.toLocaleString()}`,
    `$${item.thisClaim.toLocaleString()}`,
  ]);
  
  doc.autoTable({
    startY: 100,
    head: [['#', 'Description', 'Contract Value', '% Complete', 'Previous Claims', 'This Claim']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [33, 150, 243] },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text(`Subtotal (Ex GST): $${claim.totals.exGst.toLocaleString()}`, 130, finalY);
  doc.text(`GST: $${claim.totals.gst.toLocaleString()}`, 130, finalY + 7);
  doc.setFontSize(14);
  doc.text(`Total (Inc GST): $${claim.totals.incGst.toLocaleString()}`, 130, finalY + 17);
  
  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 280);
  
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}

export function generateInvoicePDF(claim: Claim, contract: Contract): Blob {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.text('INVOICE', 20, 25);
  
  // Invoice details
  doc.setFontSize(12);
  doc.text(`Invoice #: INV-${claim.number.toString().padStart(3, '0')}`, 20, 40);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 47);
  doc.text(`Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 20, 54);
  
  // Company information (right side)
  doc.text('From:', 130, 40);
  doc.text('[Your Company Name]', 130, 47);
  doc.text(`ABN: ${contract.abn || '[ABN]'}`, 130, 54);
  
  // Client information
  doc.text('Bill To:', 20, 75);
  doc.text(contract.clientInfo.name, 20, 82);
  if (contract.clientInfo.email) {
    doc.text(contract.clientInfo.email, 20, 89);
  }
  if (contract.clientInfo.phone) {
    doc.text(contract.clientInfo.phone, 20, 96);
  }
  
  // Contract reference
  doc.text(`Re: ${contract.name}`, 20, 110);
  doc.text(`Progress Claim #${claim.number}`, 20, 117);
  
  // Line items table
  const tableData = claim.items.map((item, index) => [
    index + 1,
    item.description,
    `$${item.contractValue.toLocaleString()}`,
    `${item.percentComplete}%`,
    `$${item.thisClaim.toLocaleString()}`,
  ]);
  
  doc.autoTable({
    startY: 130,
    head: [['#', 'Description', 'Contract Value', '% Complete', 'Amount']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [33, 150, 243] },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.text(`Subtotal: $${claim.totals.exGst.toLocaleString()}`, 130, finalY);
  doc.text(`GST (${(contract.gstRate * 100)}%): $${claim.totals.gst.toLocaleString()}`, 130, finalY + 7);
  doc.setFontSize(14);
  doc.text(`TOTAL: $${claim.totals.incGst.toLocaleString()}`, 130, finalY + 17);
  
  // Payment terms
  doc.setFontSize(10);
  doc.text('Payment Terms: Net 30 days', 20, finalY + 30);
  doc.text('Please remit payment to the above address.', 20, finalY + 37);
  
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
