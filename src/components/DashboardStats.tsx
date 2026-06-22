import React from 'react';
import { Package, AlertTriangle, ArrowUpDown, Archive } from 'lucide-react';
import { InventoryItem, MovementLog } from '../types.ts';

interface StatsProps {
  items: InventoryItem[];
  movements: MovementLog[];
  alertsCount: number;
}

export const DashboardStats: React.FC<StatsProps> = ({ items, movements, alertsCount }) => {
  const totalItems = items.length;
  const totalStock = items.reduce((acc, item) => acc + item.stock, 0);
  
  // Calculate MTD (Month to Date) Movements
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const mtdMovements = movements.filter(m => {
    return new Date(m.createdAt) >= startOfMonth;
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Products card */}
      <div id="stat-total-skus" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between hover:scale-[1.01] transition-all">
        <div className="space-y-1">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Catalog SKUs</p>
          <h3 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">{totalItems}</h3>
          <p className="text-xs text-slate-400">Listed stock types</p>
        </div>
        <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600">
          <Package className="w-6 h-6" />
        </div>
      </div>

      {/* Total Stock in Warehouse */}
      <div id="stat-total-stock" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between hover:scale-[1.01] transition-all">
        <div className="space-y-1">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Warehouse Units</p>
          <h3 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">
            {totalStock.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400">Aggregate items on shell</p>
        </div>
        <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600">
          <Archive className="w-6 h-6" />
        </div>
      </div>

      {/* Active Alerts */}
      <div id="stat-stock-alerts" className={`bg-white rounded-3xl border p-6 shadow-xs flex items-center justify-between transition-all hover:scale-[1.01] ${alertsCount > 0 ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
        <div className="space-y-1">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Critical Alerts</p>
          <h3 className={`text-2xl font-bold font-sans tracking-tight ${alertsCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{alertsCount}</h3>
          <p className="text-xs text-slate-400">Items below safety limit</p>
        </div>
        <div className={`p-3.5 rounded-2xl ${alertsCount > 0 ? 'bg-red-150/50 text-red-700' : 'bg-slate-50 text-slate-400'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* Month MTD movements */}
      <div id="stat-mtd-movements" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between transition-all hover:scale-[1.01]">
        <div className="space-y-1">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">MTD System Logs</p>
          <h3 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">{mtdMovements}</h3>
          <p className="text-xs text-slate-400">Ledger operations this month</p>
        </div>
        <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600">
          <ArrowUpDown className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
