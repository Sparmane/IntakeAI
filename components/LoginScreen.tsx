
import React, { useState } from 'react';
import { AI_CONFIG } from '../config';
import { Shield, Lock, ArrowRight, CheckCircle, Server } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    // Simulate network delay for UX
    await new Promise(r => setTimeout(r, 800));
    onLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-fadeIn">
        
        {/* Header */}
        <div className="p-8 pb-0 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6 transform rotate-3">
             <span className="text-white font-bold text-2xl">IA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Welcome to IntakeAI</h1>
          <p className="text-slate-400 text-sm">Enterprise Requirements Analysis Suite</p>
        </div>

        {/* Security Badge */}
        <div className="px-8 py-6">
           <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex items-start gap-3">
             <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
             <div className="text-xs text-blue-200">
               <p className="font-bold mb-1">Corporate Environment</p>
               <p className="opacity-80">Access to this application is restricted. Please sign in using your corporate Entra ID credentials.</p>
             </div>
           </div>
        </div>

        {/* Action Area */}
        <div className="p-8 pt-0">
          <button 
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] disabled:opacity-70 disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                Authenticating...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                  <path d="M10.5 0L0 0L0 10.5L10.5 10.5L10.5 0Z" fill="#F25022"/>
                  <path d="M21 0L10.5 0L10.5 10.5L21 10.5L21 0Z" fill="#7FBA00"/>
                  <path d="M10.5 10.5L0 10.5L0 21L10.5 21L10.5 10.5Z" fill="#00A4EF"/>
                  <path d="M21 10.5L10.5 10.5L10.5 21L21 21L21 10.5Z" fill="#FFB900"/>
                </svg>
                Sign in with Microsoft
              </>
            )}
          </button>

          <div className="mt-6 flex flex-col gap-2 text-xs text-slate-500 text-center">
            <div className="flex items-center justify-center gap-2">
               <Lock className="w-3 h-3" /> Secure connection via {AI_CONFIG.auth.authority ? 'Entra ID' : 'Auth Service'}
            </div>
            {AI_CONFIG.auth.enabled ? (
               <div className="text-emerald-500/80 flex items-center justify-center gap-1">
                 <Server className="w-3 h-3" /> SSO Active
               </div>
            ) : (
               <div className="text-yellow-500/80 flex items-center justify-center gap-1">
                 <CheckCircle className="w-3 h-3" /> Development Mode (Auth Bypassed)
               </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600">
           <span>v2.1.0</span>
           <span className="flex items-center gap-1">Azure Powered <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div></span>
        </div>

      </div>
    </div>
  );
};
