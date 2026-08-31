import { Proposal } from '@/modules/core/types';
import { formatINR, formatSqFt, formatDate } from './formatters';

/**
 * Generates and triggers download / print for Fairway Commercial Proposal PDF.
 */
export const downloadProposalPDF = (proposal: Proposal) => {
  const proposalNum = proposal.proposalNumber || 'PR-1001';
  const fileName = proposal.documentName || `Fairway_Proposal_${proposalNum}.pdf`;

  const annualRent = (proposal.totalMonthlyRentINR || 0) * 12;
  const baseMonthly = (proposal.proposedAreaSqFt || 0) * (proposal.baseRentPerSqFtINR || 0);
  const camMonthly = (proposal.proposedAreaSqFt || 0) * (proposal.maintenancePerSqFtINR || 0);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background-color: #f8fafc;
      color: #1e293b;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-badge {
      background: #0284c7;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 500;
    }
    .meta-box {
      text-align: right;
    }
    .proposal-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      font-family: monospace;
      font-weight: 700;
      font-size: 14px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      margin-bottom: 6px;
    }
    .meta-date {
      font-size: 11px;
      color: #64748b;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 20px 0 10px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 3px solid #0284c7;
      padding-left: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    table.commercial-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px 0;
    }
    table.commercial-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    table.commercial-table td {
      padding: 10px 12px;
      font-size: 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    table.commercial-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    table.commercial-table tr.highlight td {
      background: #f0fdf4;
      font-weight: 800;
      color: #166534;
      border-top: 2px solid #86efac;
      border-bottom: 2px solid #86efac;
      font-size: 13px;
    }
    .terms-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      font-size: 11px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .terms-box ul {
      margin-left: 18px;
      margin-top: 6px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .signature-card {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
    }
    .signature-space {
      height: 48px;
      margin: 12px 0;
      border-bottom: 1px solid #94a3b8;
    }
    .signature-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .signature-sub {
      font-size: 10px;
      color: #64748b;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .page-container {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 12px; color: #64748b;">Commercial Proposal Document · Generated by Fairway AI CRM</span>
    <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-title">
          <span>FAIRWAY</span>
          <span class="brand-badge">Logistics</span>
        </div>
        <div class="brand-subtitle">Fairway Real Estate & Logistics Infrastructure LLP</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">GIDC & Logistics Corridor, Gujarat, India</div>
      </div>
      <div class="meta-box">
        <div class="proposal-badge">${proposalNum}</div>
        <div class="meta-date">Date of Issue: <strong>${proposal.proposalDate ? formatDate(proposal.proposalDate) : new Date().toLocaleDateString('en-IN')}</strong></div>
        <div class="meta-date">Offer Valid Until: <strong>${proposal.expiryDate ? formatDate(proposal.expiryDate) : '30 Days from Issue'}</strong></div>
        <div class="meta-date" style="margin-top: 4px;">Status: <strong style="color: #0284c7;">${proposal.status || 'Active Offer'}</strong></div>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="grid-2">
      <!-- Tenant / Client -->
      <div class="info-card">
        <div class="section-title" style="margin-top: 0;">1. Tenant Profile</div>
        <div class="info-row">
          <span class="info-label">Client / Company:</span>
          <span class="info-value">${proposal.companyName || 'Corporate Client'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Contact Person:</span>
          <span class="info-value">${proposal.contactName || 'Authorized Representative'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Inquiry Reference:</span>
          <span class="info-value font-mono">${proposal.inquiryNumber || 'Direct Inquiry'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Account Lead:</span>
          <span class="info-value">${proposal.createdByUserName || 'Fairway Leasing Desk'}</span>
        </div>
      </div>

      <!-- Property Details -->
      <div class="info-card">
        <div class="section-title" style="margin-top: 0;">2. Offered Asset</div>
        <div class="info-row">
          <span class="info-label">Property Name:</span>
          <span class="info-value">${proposal.propertyName || 'Industrial Facility'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Offered Leasable Area:</span>
          <span class="info-value">${formatSqFt(proposal.proposedAreaSqFt || 0)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Target Possession:</span>
          <span class="info-value">${proposal.possessionDate ? formatDate(proposal.possessionDate) : 'Immediate / Within 30 Days'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Asset Classification:</span>
          <span class="info-value">Grade-A Industrial Logistics Park</span>
        </div>
      </div>
    </div>

    <!-- Commercial Financial Structure -->
    <div class="section-title">3. Commercial Terms & Financial Structure</div>
    <table class="commercial-table">
      <thead>
        <tr>
          <th>Commercial Parameter</th>
          <th>Rate / Unit</th>
          <th style="text-align: right;">Monthly Consideration (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Base Industrial Rent</strong><br>
            <span style="font-size: 10px; color: #64748b;">Pre-engineered warehouse floor structure</span>
          </td>
          <td>₹${proposal.baseRentPerSqFtINR || 0} / sq.ft / mo</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatINR(baseMonthly)}</td>
        </tr>
        <tr>
          <td>
            <strong>CAM & Facility Maintenance</strong><br>
            <span style="font-size: 10px; color: #64748b;">Common area lighting, security, STP & road maintenance</span>
          </td>
          <td>₹${proposal.maintenancePerSqFtINR || 0} / sq.ft / mo</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatINR(camMonthly)}</td>
        </tr>
        <tr class="highlight">
          <td>
            <strong>TOTAL NET MONTHLY LEASE RENT</strong><br>
            <span style="font-size: 10px; color: #15803d;">Exclusive of applicable GST</span>
          </td>
          <td>₹${((proposal.baseRentPerSqFtINR || 0) + (proposal.maintenancePerSqFtINR || 0)).toFixed(2)} / sq.ft</td>
          <td style="text-align: right; font-family: monospace; font-weight: 900; font-size: 14px;">${formatINR(proposal.totalMonthlyRentINR || 0)}</td>
        </tr>
        <tr>
          <td>
            <strong>Annual Commitment Value</strong><br>
            <span style="font-size: 10px; color: #64748b;">Annualized lease consideration</span>
          </td>
          <td>12 Months</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatINR(annualRent)}</td>
        </tr>
        <tr>
          <td>
            <strong>Interest-Free Refundable Security Deposit</strong><br>
            <span style="font-size: 10px; color: #64748b;">Equivalent to ${proposal.securityDepositMonths || 6} months' lease rent</span>
          </td>
          <td>${proposal.securityDepositMonths || 6} Months</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #0284c7;">${formatINR(proposal.totalDepositINR || (proposal.totalMonthlyRentINR || 0) * (proposal.securityDepositMonths || 6))}</td>
        </tr>
      </tbody>
    </table>

    <!-- Lease Covenant Parameters -->
    <div class="section-title">4. Lease Governance & Covenants</div>
    <div class="grid-2">
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Lease Tenure:</span>
          <span class="info-value">${proposal.leaseTenureYears || 5} Years (Renewable)</span>
        </div>
        <div class="info-row">
          <span class="info-label">Lock-in Period:</span>
          <span class="info-value">${proposal.lockInMonths || 36} Months</span>
        </div>
      </div>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Annual Escalation:</span>
          <span class="info-value">${proposal.escalationPercentPerYear || 5}% per annum</span>
        </div>
        <div class="info-row">
          <span class="info-label">Stamp Duty & Registration:</span>
          <span class="info-value">50:50 Shared</span>
        </div>
      </div>
    </div>

    <!-- Standard Terms -->
    <div class="section-title">5. Standard Operating Conditions</div>
    <div class="terms-box">
      <strong>Key Operating Clauses:</strong>
      <ul>
        <li><strong>Fit-out Period:</strong> A rent-free fit-out period of 30 days shall be granted from the formal date of handover.</li>
        <li><strong>Utility & Power:</strong> Dedicated electricity power connection and industrial water supply will be metered and charged at actuals.</li>
        <li><strong>Statutory Compliances:</strong> The property holds valid Factory Inspectorate, Fire NOC, and Industrial Environmental clearances.</li>
        <li><strong>Maintenance:</strong> Comprehensive 24x7 security personnel, high-mast external illumination, and stormwater drainage maintained by Lessor.</li>
      </ul>
      ${proposal.notes ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1;"><strong>Specific Proposal Remarks:</strong> ${proposal.notes}</div>` : ''}
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="signature-card">
        <div class="signature-title">For Fairway Logistics Infrastructure LLP</div>
        <div class="signature-space"></div>
        <div class="signature-title">${proposal.createdByUserName || 'Authorized Signatory'}</div>
        <div class="signature-sub">Designated Leasing Partner / Manager</div>
      </div>
      <div class="signature-card">
        <div class="signature-title">Accepted & Agreed for ${proposal.companyName || 'Tenant'}</div>
        <div class="signature-space"></div>
        <div class="signature-title">${proposal.contactName || 'Authorized Signatory'}</div>
        <div class="signature-sub">Designation & Corporate Seal</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Fairway AI CRM · Confidential Commercial Proposal · Ref #${proposalNum} · System Generated Document
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  // Create an iframe or new window for printing/saving as PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    // Fallback: Blob download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/, '.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
