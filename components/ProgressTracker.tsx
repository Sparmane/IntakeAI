import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FullSessionExport } from '../types';

interface ProgressTrackerProps {
  overallProgress: number;
  sessionData: FullSessionExport;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ overallProgress, sessionData }) => {
  const data = [
    { name: 'Completed', value: overallProgress },
    { name: 'Remaining', value: 100 - overallProgress },
  ];
  const COLORS = ['#3b82f6', '#1e293b'];

  const stats = [
    { label: 'Charter Fields', value: sessionData.summary?.stats?.charter_fields_captured || 0, total: 10 },
    { label: 'User Stories', value: sessionData.summary?.stats?.user_stories_count || 0, total: null },
    { label: 'Requirements', value: sessionData.summary?.stats?.requirements_count || 0, total: null },
  ];

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-4">Completeness Analysis</h2>
      
      <div className="flex items-center gap-6">
        <div className="w-28 h-28 relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={30}
                outerRadius={45}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-white">{Math.round(overallProgress)}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
           {stats.map((stat, idx) => (
             <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2 last:border-0">
               <span className="text-slate-400">{stat.label}</span>
               <span className="text-white font-mono">
                 {stat.value} {stat.total ? `/ ${stat.total}` : ''}
               </span>
             </div>
           ))}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Charter Status</span>
          <span className={`uppercase font-bold ${sessionData.artifacts?.project_charter?.status === 'not_started' ? 'text-slate-500' : 'text-emerald-400'}`}>
            {sessionData.artifacts?.project_charter?.status?.replace('_', ' ') || 'PENDING'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Data Quality</span>
          <span className="text-blue-400 uppercase font-bold">{sessionData.data_quality?.replace('_', ' ') || 'INITIAL'}</span>
        </div>
      </div>
    </div>
  );
};