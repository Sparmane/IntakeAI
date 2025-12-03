import React, { useEffect, useState } from 'react';
import { X, TestTube, Zap, RefreshCw } from 'lucide-react';

interface DevPanelProps {
  onInjectData: (type: 'basic' | 'intermediate' | 'advanced') => void;
  onSimulateRound: () => void;
  onReset: () => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({ onInjectData, onSimulateRound, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-emerald-400 font-bold flex items-center gap-2">
          <TestTube className="w-5 h-5" /> Developer Panel
        </h2>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-8">
        <div>
          <h3 className="text-slate-300 text-sm font-semibold mb-3 uppercase tracking-wider">Data Injection</h3>
          <div className="space-y-2">
            <button 
              onClick={() => onInjectData('basic')}
              className="w-full text-left px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-sm text-slate-300 transition-colors"
            >
              Inject Basic Data (Charter)
            </button>
            <button 
              onClick={() => onInjectData('intermediate')}
              className="w-full text-left px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-sm text-slate-300 transition-colors"
            >
              Inject Intermediate (Reqs)
            </button>
            <button 
              onClick={() => onInjectData('advanced')}
              className="w-full text-left px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-sm text-slate-300 transition-colors"
            >
              Inject Advanced (Full)
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-slate-300 text-sm font-semibold mb-3 uppercase tracking-wider">Simulation</h3>
          <button 
            onClick={onSimulateRound}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
          >
            <Zap className="w-4 h-4" /> Trigger Analyst Round
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Forces the "Requirements Analyst" and "Validator" to process the current transcript immediately.
          </p>
        </div>

        <div>
           <h3 className="text-slate-300 text-sm font-semibold mb-3 uppercase tracking-wider">Session</h3>
           <button 
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900 rounded text-red-200 text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset Session
          </button>
        </div>
      </div>
    </div>
  );
};
