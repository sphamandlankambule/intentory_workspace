import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { TrendStat } from '../types.ts';

interface ChartProps {
  stats: TrendStat[];
}

export const MovementChart: React.FC<ChartProps> = ({ stats }) => {
  const isDataEmpty = stats.every(s => s.incoming === 0 && s.outgoing === 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium font-sans text-gray-900">Historical Distribution Trends</h4>
          <p className="text-xs text-gray-400">Total units logged by day over the last 15 days</p>
        </div>
        {isDataEmpty && (
          <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-400 px-2.5 py-1 rounded-sm font-mono uppercase">
            No Active Movements Processed
          </span>
        )}
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={stats} 
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={10} 
              fontFamily="monospace"
              tickLine={false} 
              axisLine={false}
              dy={10}
              tickFormatter={(tick) => {
                const parts = tick.split('-');
                return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : tick;
              }}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10} 
              fontFamily="monospace"
              tickLine={false} 
              axisLine={false} 
              dx={-5}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                fontFamily: 'sans-serif',
                fontSize: '12px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
            />
            <Area 
              type="monotone" 
              name="Incoming Items"
              dataKey="incoming" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorIncoming)" 
            />
            <Area 
              type="monotone" 
              name="Outgoing Items"
              dataKey="outgoing" 
              stroke="#f43f5e" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorOutgoing)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
