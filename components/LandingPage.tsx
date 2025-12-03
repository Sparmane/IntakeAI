
import React from 'react';
import { ProfileConfig } from '../config';
import { Briefcase, TrendingUp, Target, Lock, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  profiles: ProfileConfig[];
  onSelectProfile: (profile: ProfileConfig) => void;
}

const IconMap = {
  Briefcase,
  TrendingUp,
  Target
};

export const LandingPage: React.FC<LandingPageProps> = ({ profiles, onSelectProfile }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="text-center mb-12 z-10 max-w-2xl">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 mx-auto mb-6 transform rotate-3">
            <span className="text-white font-bold text-2xl">IA</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
          Intake<span className="text-blue-500">AI</span> Agent Suite
        </h1>
        <p className="text-slate-400 text-lg">
          Select an intelligent agent profile to begin your session. Each agent is specialized with unique contexts and output artifacts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full z-10">
        {profiles.map((profile) => {
          const Icon = IconMap[profile.iconName] || Briefcase;
          const isAvailable = profile.isAvailable;
          
          return (
            <div 
              key={profile.id}
              onClick={() => isAvailable && onSelectProfile(profile)}
              className={`group relative p-8 rounded-2xl border transition-all duration-300 flex flex-col h-full ${
                isAvailable 
                  ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1' 
                  : 'bg-slate-900/50 border-slate-800/50 opacity-70 cursor-not-allowed grayscale-[0.5]'
              }`}
            >
              {!isAvailable && (
                <div className="absolute top-4 right-4 bg-slate-800 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> COMING SOON
                </div>
              )}

              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-colors ${
                 isAvailable ? `bg-${profile.color}-900/20 text-${profile.color}-400` : 'bg-slate-800 text-slate-600'
              }`}>
                <Icon className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {profile.name}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
                {profile.description}
              </p>

              <div className={`flex items-center text-sm font-semibold transition-colors mt-auto ${
                isAvailable ? 'text-blue-500 group-hover:text-blue-400' : 'text-slate-600'
              }`}>
                {isAvailable ? (
                  <>
                    Launch Workspace <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <span>Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-slate-600 text-sm z-10">
        Powered by Google Gemini 2.0 & Azure OpenAI • Enterprise Grade Security
      </div>
    </div>
  );
};
