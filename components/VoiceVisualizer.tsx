import React from 'react';
import { ConnectionState } from '../types';
import { Mic, PauseCircle } from 'lucide-react';

interface VoiceVisualizerProps {
  connectionState: ConnectionState;
  isSpeaking: boolean;
  volume: number; // 0-1
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ connectionState, isSpeaking, volume }) => {
  // Simulate bars based on volume
  const bars = [1, 2, 3, 4, 5];
  
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isPaused = connectionState === ConnectionState.PAUSED;
  const isActive = isConnected || isPaused;

  return (
    <div className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 transition-colors duration-300 ${
      isConnected ? 'border-blue-500 bg-blue-900/20' : 
      isPaused ? 'border-yellow-500 bg-yellow-900/20' :
      'border-gray-600 bg-gray-900'
    }`}>
      {isActive && !isPaused && (
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {bars.map((i) => {
             // Dynamic height simulation
             const height = isSpeaking ? 20 + (volume * 80 * Math.random()) : 10;
             return (
               <div
                 key={i}
                 className="w-2 bg-blue-400 rounded-full transition-all duration-75"
                 style={{ height: `${height}%`, opacity: 0.8 }}
               />
             );
          })}
        </div>
      )}
      
      {isPaused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-yellow-500 animate-pulse">
          <PauseCircle className="w-8 h-8 mb-1" />
          <span className="text-xs font-bold uppercase tracking-widest">Paused</span>
        </div>
      )}
      
      {!isActive && (
        <div className="text-gray-500 font-semibold flex flex-col items-center">
          <Mic className="w-6 h-6 mb-1 opacity-50" />
          <span className="text-xs">Offline</span>
        </div>
      )}

      {/* Ripple effect when active */}
      {isConnected && (
        <div className="absolute -inset-2 border border-blue-500/30 rounded-full animate-ping" />
      )}
    </div>
  );
};