import React, { useState } from 'react';
import { 
  Download, FileText, Printer, ArrowDownLeft, ArrowUpRight, Search, 
  Tag, Truck, UserCheck, Calendar, Info 
} from 'lucide-react';
import { MovementLog } from '../types.ts';

interface AuditProps {
  movements: MovementLog[];
}

export const AuditLogTable: React.FC<AuditProps> = ({ movements }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All'); // 'All' | 'incoming' | 'outgoing'

  // Filtering Logs
  const filteredLogs = movements.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      m.itemSku.toLowerCase().includes(term) ||
      m.itemName.toLowerCase().includes(term) ||
      (m.recipient && m.recipient.toLowerCase().includes(term)) ||
      (m.reason && m.reason.toLowerCase().includes(term)) ||
      (m.carrier && m.carrier.toLowerCase().includes(term)) ||
      m.operatorEmail.toLowerCase().includes(term);

    const matchesType = selectedType === 'All' || m.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Action: Export as CSV
  const exportCSV = () => {
    const headers = [
      'Log ID', 
      'Timestamp', 
      'SKU', 
      'Product Name', 
      'Adjustment Type', 
      'Quantity Change', 
      'Recipient/Destination', 
      'Reason', 
      'Shipping Carrier', 
      'Operator Email', 
      'Operator Role'
    ];

    const rows = filteredLogs.map(m => [
      m.id,
      new Date(m.createdAt).toLocaleString(),
      `"${m.itemSku.replace(/"/g, '""')}"`,
      `"${m.itemName.replace(/"/g, '""')}"`,
      m.type.toUpperCase(),
      m.quantity,
      `"${(m.recipient || '').replace(/"/g, '""')}"`,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
      `"${(m.carrier || '').replace(/"/g, '""')}"`,
      `"${m.operatorEmail.replace(/"/g, '""')}"`,
      m.operatorRole
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory-audit-trace-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action: Print / PDF Export
  const printLedger = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocked! Please allow popups to compile the printable PDF report.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Tracking - Traceability Audit Ledger</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #0f172a; }
            p { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-family: monospace; text-transform: uppercase; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .badge-in { background-color: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: monospace; display: inline-block; }
            .badge-out { background-color: #fff1f2; color: #9f1239; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: monospace; display: inline-block; }
            .operator { font-family: monospace; font-size: 9px; color: #64748b; }
            .meta { margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>IN-HOUSE INVENTORY AUDIT LEDGER</h1>
          <p>Generated on: ${new Date().toLocaleString()} | Operational scope: ${selectedType.toUpperCase()} | Search Filter: '${searchTerm || 'None'}'</p>
          
          <table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>SKU</th>
                <th>Item Name</th>
                <th>Adjustment</th>
                <th>Trace Particulars (Outgoing)</th>
                <th>Operator Accounts</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map(m => `
                <tr>
                  <td>${new Date(m.createdAt).toLocaleString()}</td>
                  <td style="font-family: monospace; font-weight: bold;">${m.itemSku}</td>
                  <td><strong>${m.itemName}</strong></td>
                  <td>
                    <span class="${m.type === 'incoming' ? 'badge-in' : 'badge-out'}">
                      ${m.type === 'incoming' ? '+' : ''}${m.quantity}
                    </span>
                  </td>
                  <td>
                    ${m.type === 'outgoing' ? `
                      <div style="font-size: 9px;">
                        <strong>Recipient:</strong> ${m.recipient || '-'}<br/>
                        <strong>Reason:</strong> ${m.reason || '-'}<br/>
                        <strong>Carrier:</strong> ${m.carrier || '-'}
                      </div>
                    ` : '<em style="color:#cbd5e1;">Incoming Stock Addition</em>'}
                  </td>
                  <td class="operator">
                    ${m.operatorEmail}<br/>
                    Role: ${m.operatorRole.toUpperCase()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="meta">
            End of Document. Total movements summarized: ${filteredLogs.length} transaction entries. Secure Warehouse Core Ledger System exports.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      
      {/* Header and exports */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-semibold font-sans text-gray-900">Traceability Ledger & Audits</h3>
          <p className="text-xs text-slate-400">Chronological history log tracking incoming stock additions and outbound tracing</p>
        </div>

        {/* Export triggers */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* CSV export */}
          <button
            id="btn-export-csv"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-gray-700 py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            EXPORT CSV
          </button>

          {/* PDF printable report */}
          <button
            id="btn-export-pdf"
            onClick={printLedger}
            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-gray-700 py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            EXPORT PDF REPORT
          </button>
        </div>
      </div>

      {/* Filter and search area */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            id="input-audit-search"
            type="text"
            placeholder="Search trace details (SKU, Recipient, Operator, distribution reason...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden focus:border-slate-450 placeholder:text-gray-450 transition-colors"
          />
        </div>

        {/* Type selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-bold whitespace-nowrap">Logs filter:</span>
          <select
            id="select-audit-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex-1 bg-transparent text-xs font-sans text-gray-800 focus:outline-hidden"
          >
            <option value="All">All Operations</option>
            <option value="incoming">🟢 Incoming Logs</option>
            <option value="outgoing">🔴 Outgoing Distribution</option>
          </select>
        </div>
      </div>

      {/* Audit table list (highly styled) */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Stamp</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Item SKUs</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Adjustment</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Tracing particulars (Outbound)</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Operator ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-xs font-sans">
                    No movement records registered for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isIncoming = log.type === 'incoming';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/20 transition-colors">
                      {/* DateTime Stamp */}
                      <td className="px-5 py-4 whitespace-nowrap text-[11px] font-mono text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      {/* Item Info */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-gray-900 leading-normal">{log.itemName}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">SKU: {log.itemSku}</div>
                      </td>

                      {/* Adjustment badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isIncoming ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold font-mono rounded-md">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{Math.abs(log.quantity)} Units
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-100 font-bold font-mono rounded-md">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            {log.quantity} Units
                          </span>
                        )}
                      </td>

                      {/* Tracing parameters (Only outgoing) */}
                      <td className="px-5 py-4 max-w-sm">
                        {!isIncoming ? (
                          <div className="space-y-1 bg-amber-50/30 border border-amber-100/50 p-2.5 rounded-lg text-[11px] text-slate-700 font-sans">
                            <p className="flex items-center gap-1.5">
                              <Tag className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              <span className="text-gray-400 font-medium">To:</span> <strong className="text-slate-800">{log.recipient}</strong>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Info className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              <span className="text-gray-400 font-medium">Reason:</span> <span className="italic">{log.reason}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Truck className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              <span className="text-gray-400 font-medium">Carrier:</span> <span className="font-mono text-gray-800">{log.carrier}</span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-sm">
                            Stock replenishment
                          </span>
                        )}
                      </td>

                      {/* Operator accounts */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.operatorEmail}</span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 mt-1 uppercase pl-5">
                          Role: {log.operatorRole}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
