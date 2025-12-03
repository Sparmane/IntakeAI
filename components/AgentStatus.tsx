import React from 'react';
import { AgentRole } from '../types';
import { Bot, FileSearch, CheckCircle } from 'lucide-react';

interface AgentStatusProps {
  activeAgent: AgentRole;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ activeAgent }) => {
  const agents = [
    { id: AgentRole.CONVERSATION, icon: Bot, label: 'Conversation', color: 'text-blue-400' },
    { id: AgentRole.ANALYST, icon: FileSearch, label: 'Analyst', color: 'text-purple-400' },
    { id: AgentRole.VALIDATOR, icon: CheckCircle, label: 'Validator', color: 'text-emerald-400' },
  ];

  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
      {agents.map((agent) => {
        const isActive = activeAgent === agent.id;
        const Icon = agent.icon;
        
        return (
          <div 
            key={agent.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
              isActive 
                ? 'bg-slate-700 border-slate-500 opacity-100 scale-105 shadow-lg shadow-blue-900/20' 
                : 'bg-transparent border-transparent opacity-40 grayscale'
            }`}
          >
            <Icon className={`w-5 h-5 ${agent.color}`} />
            <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
              {agent.label}
            </span>
            {isActive && (
              <span className="flex h-2 w-2 ml-1 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};