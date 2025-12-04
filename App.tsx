

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ConnectionState, 
  AgentRole, 
  FullSessionExport, 
  Message,
  createInitialSessionData,
  AuthUser
} from './types';
import { createAudioContext, createBlob, decodeAudioData, decode, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from './utils/audioUtils';
import { analyzeConversation } from './services/analysisService';
import { authService } from './services/authService';
import { uploadSessionToCloud } from './services/storageService'; // Imported for auto-save
import { AI_CONFIG, getLiveModelName, ConfigManager, ProfileConfig } from './config';

import { VoiceVisualizer } from './components/VoiceVisualizer';
import { AgentStatus } from './components/AgentStatus';
import { ArtifactViewer } from './components/ArtifactViewer';
import { ProgressTracker } from './components/ProgressTracker';
import { DevPanel } from './components/DevPanel';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';

import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, AlertCircle, Pause, Play, Save, Trash2, History, Upload, ChevronLeft, LogOut, User as UserIcon, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'intake_ai_session_v1';

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- App State ---
  const [activeProfile, setActiveProfile] = useState<ProfileConfig | null>(null);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [activeAgent, setActiveAgent] = useState<AgentRole>(AgentRole.CONVERSATION);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [messages, setMessages] = useState<Message[]>([]);
  
  // New Complex State
  const [sessionData, setSessionData] = useState<FullSessionExport>(createInitialSessionData());
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState<boolean>(false); // State for auto-save
  
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const liveSessionRef = useRef<any>(null); // For Gemini
  const azureSocketRef = useRef<WebSocket | null>(null); // For Azure
  const audioContextRef = useRef<{ input: AudioContext | null, output: AudioContext | null }>({ input: null, output: null });
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcript & Context Management
  const transcriptRef = useRef<string>("");
  const uploadedContextRef = useRef<string>("");
  const inputBufferRef = useRef<string>(""); // Buffer for current user turn
  const outputBufferRef = useRef<string>(""); // Buffer for current agent turn
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State Refs for event handlers
  const isPausedRef = useRef<boolean>(false);
  const isAnalyzingRef = useRef<boolean>(false);
  const lastAudioUpdateRef = useRef<number>(0);

  // --- Auth Logic ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.checkAuth();
        setCurrentUser(user);
      } catch (e) {
        console.error("Auth initialization failed", e);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    try {
      const user = await authService.login();
      setCurrentUser(user);
    } catch (e) {
      console.error("Login failed", e);
      setError("Authentication failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    // Attempt auto-save on logout if we have data
    await performAutoSave();
    await authService.logout();
    setCurrentUser(null);
    clearSession();
  };

  // --- Persistence Logic ---

  // Check for saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSavedSession(true);
      // We don't show the modal immediately on mount anymore, 
      // we wait until the user selects a profile to keep the landing page clean.
    }
  }, []);

  const handleProfileSelect = (profile: ProfileConfig) => {
    setActiveProfile(profile);
    // If we have a saved session, now is the time to ask if they want to resume
    if (hasSavedSession) {
      setShowResumeModal(true);
    }
  };

  // Auto-save session data when it changes
  useEffect(() => {
    if (sessionData.completeness_percentage > 0 || transcriptRef.current.length > 0) {
      saveSession();
    }
  }, [sessionData]);

  const saveSession = () => {
    const payload = {
      sessionData,
      transcript: transcriptRef.current,
      uploadedContext: uploadedContextRef.current,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setHasSavedSession(true);
  };

  const loadSession = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessionData(parsed.sessionData);
        transcriptRef.current = parsed.transcript || "";
        uploadedContextRef.current = parsed.uploadedContext || "";
        setShowResumeModal(false);
      }
    } catch (e) {
      console.error("Failed to load session", e);
      clearSession();
    }
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedSession(false);
    setShowResumeModal(false);
    setSessionData(createInitialSessionData());
    transcriptRef.current = "";
    uploadedContextRef.current = "";
    setMessages([]);
  };

  const performAutoSave = async () => {
    // Only upload if we have meaningful data
    if (sessionData.completeness_percentage > 5 || transcriptRef.current.length > 50) {
      try {
        setIsSavingToCloud(true);
        console.log("Automatically backing up session to cloud repository...");
        await uploadSessionToCloud(sessionData);
      } catch (e) {
        console.warn("Auto-save to cloud failed:", e);
      } finally {
        setIsSavingToCloud(false);
      }
    }
  };

  const handleExitSession = async () => {
    // Trigger auto-save then disconnect
    await performAutoSave();
    saveSession();
    disconnect();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // --- Audio Setup & AI Connection ---

  const connectToAI = useCallback(async () => {
    try {
      if (!activeProfile) return;

      if (AI_CONFIG.provider === 'GEMINI' && !AI_CONFIG.gemini.apiKey) {
        throw new Error("Google API Key not found in environment.");
      }
      if (AI_CONFIG.provider === 'AZURE' && !AI_CONFIG.azure.apiKey) {
         throw new Error("Azure API Key not found in environment.");
      }

      // Cleanup any existing session first
      await disconnect();

      setConnectionState(ConnectionState.CONNECTING);
      setError(null);
      isPausedRef.current = false;
      
      // Initialize Audio Contexts
      const inputContext = createAudioContext({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
      const outputContext = createAudioContext({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      
      audioContextRef.current = { input: inputContext, output: outputContext };
      
      // Ensure contexts are running (browser autoplay policy)
      if (inputContext.state === 'suspended') await inputContext.resume();
      if (outputContext.state === 'suspended') await outputContext.resume();

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Build System Instruction with history and uploaded context
      let effectiveSystemInstruction = activeProfile.systemInstruction; // Use profile specific instruction
      
      if (uploadedContextRef.current) {
        effectiveSystemInstruction += `\n\n=== BACKGROUND PROJECT DATA ===\nThe user has uploaded the following project context/documents. Use this information to inform your questions and validate requirements. Do not ask for information that is already clearly defined here, unless you need clarification:\n${uploadedContextRef.current}`;
      }

      if (transcriptRef.current && transcriptRef.current.length > 50) {
        console.log("Injecting previous context into session...");
        effectiveSystemInstruction += `\n\n=== PREVIOUS SESSION CONTEXT ===\nThe following is a transcript of the interview so far. You must resume the interview from where it left off, utilizing the established facts. Do not restart the interview.\n\n${transcriptRef.current}`;
      }

      // --- PROVIDER SELECTION ---
      
      if (AI_CONFIG.provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey: AI_CONFIG.gemini.apiKey });
        const sessionPromise = ai.live.connect({
          model: getLiveModelName(),
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: AI_CONFIG.gemini.voiceName } },
            },
            systemInstruction: effectiveSystemInstruction,
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              setConnectionState(ConnectionState.CONNECTED);
              setActiveAgent(AgentRole.CONVERSATION);
              startAudioProcessing(inputContext, stream, 'GEMINI');
            },
            onmessage: async (msg: LiveServerMessage) => {
              const { serverContent } = msg;
              if (serverContent?.inputTranscription?.text) inputBufferRef.current += serverContent.inputTranscription.text;
              if (serverContent?.outputTranscription?.text) outputBufferRef.current += serverContent.outputTranscription.text;
              
              if (serverContent?.turnComplete) {
                  handleTurnComplete();
              }
              if (serverContent?.interrupted) {
                  handleInterruption();
              }
              
              const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                  await playAudioChunk(audioData);
              }
            },
            onclose: () => handleRemoteClose(),
            onerror: (err) => {
              console.error(err);
              setError("Connection unstable. If voice stops, please restart.");
            }
          }
        });
        liveSessionRef.current = await sessionPromise;

      } else {
        // --- AZURE OPENAI IMPLEMENTATION ---
        // Robust URL construction: Remove protocol if present, remove trailing slash
        const rawEndpoint = AI_CONFIG.azure.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, ''); 
        const wsUrl = `wss://${rawEndpoint}/openai/realtime?api-version=${AI_CONFIG.azure.apiVersion}&deployment=${AI_CONFIG.azure.deploymentName}&api-key=${AI_CONFIG.azure.apiKey}`;
        
        const ws = new WebSocket(wsUrl, 'realtime-resolution-fix'); // protocol usually ignored by browser JS, but harmless
        azureSocketRef.current = ws;

        ws.onopen = () => {
          setConnectionState(ConnectionState.CONNECTED);
          setActiveAgent(AgentRole.CONVERSATION);

          // Configure Session
          ws.send(JSON.stringify({
             type: "session.update",
             session: {
               modalities: ["audio", "text"],
               instructions: effectiveSystemInstruction,
               voice: AI_CONFIG.azure.voiceName,
               input_audio_format: "pcm16",
               output_audio_format: "pcm16",
               turn_detection: {
                 type: "server_vad"
               }
             }
          }));

          startAudioProcessing(inputContext, stream, 'AZURE');
        };

        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'response.audio.delta':
              if (data.delta) await playAudioChunk(data.delta);
              break;
            case 'response.audio_transcript.delta':
              if (data.delta) outputBufferRef.current += data.delta;
              break;
            case 'conversation.item.input_audio_transcription.completed':
              if (data.transcript) inputBufferRef.current += data.transcript;
              break;
            case 'response.done':
              // Azure turn complete
              handleTurnComplete();
              break;
            case 'input_audio_buffer.speech_started':
              handleInterruption();
              break;
            case 'error':
              console.error("Azure Error:", data.error);
              setError(`Azure Error: ${data.error?.message}`);
              break;
          }
        };

        ws.onclose = () => handleRemoteClose();
        ws.onerror = (e) => {
          console.error(e);
          setError("Azure Connection Failed.");
        };
      }

    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
      setError(e instanceof Error ? e.message : "Unknown error");
      await disconnect();
    }
  }, [connectionState, activeProfile]);

  // --- Helper Methods ---

  const startAudioProcessing = (context: AudioContext, stream: MediaStream, provider: 'GEMINI' | 'AZURE') => {
      const source = context.createMediaStreamSource(stream);
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;
      
      scriptProcessor.onaudioprocess = (e) => {
        if (isPausedRef.current) return;
        
        // Critical check: Ensure session is still valid
        if (provider === 'GEMINI' && !liveSessionRef.current) return;
        if (provider === 'AZURE' && (!azureSocketRef.current || azureSocketRef.current.readyState !== WebSocket.OPEN)) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Audio Visualization
        const now = Date.now();
        if (now - lastAudioUpdateRef.current > 100) {
          let sum = 0;
          for(let i=0; i<inputData.length; i+=4) sum += inputData[i] * inputData[i];
          const rms = Math.sqrt(sum / (inputData.length / 4));
          setAudioLevel(rms);
          lastAudioUpdateRef.current = now;
        }

        try {
          const pcmBlob = createBlob(inputData);
          
          if (provider === 'GEMINI') {
             liveSessionRef.current.sendRealtimeInput({ media: pcmBlob });
          } else {
             // Azure expects base64 PCM payload
             azureSocketRef.current?.send(JSON.stringify({
               type: "input_audio_buffer.append",
               audio: pcmBlob.data
             }));
          }
        } catch (err) {
          // Silent catch
        }
      };
      
      source.connect(scriptProcessor);
      scriptProcessor.connect(context.destination);
  };

  const playAudioChunk = async (base64Audio: string) => {
      if (isPausedRef.current) return;
      setActiveAgent(AgentRole.CONVERSATION); 
      
      const ctx = audioContextRef.current.output;
      if (!ctx) return;

      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        ctx,
        AUDIO_SAMPLE_RATE_OUTPUT,
        1
      );
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0; 
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      
      sourcesRef.current.add(source);
      source.onended = () => {
        sourcesRef.current.delete(source);
      };
  };

  const handleTurnComplete = () => {
      const userText = inputBufferRef.current.trim();
      const agentText = outputBufferRef.current.trim();
      
      let newTranscriptSegment = "";
      if (userText) {
        newTranscriptSegment += `User: ${userText}\n`;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() }]);
      }
      if (agentText) {
        newTranscriptSegment += `Agent: ${agentText}\n`;
      }

      if (newTranscriptSegment) {
        transcriptRef.current += newTranscriptSegment;
        saveSession();
        performAnalysis(); 
      }
      
      // Clear buffers
      inputBufferRef.current = "";
      outputBufferRef.current = "";
  };

  const handleInterruption = () => {
      sourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) { /* ignore */ }
      });
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      outputBufferRef.current = "";
      
      // If Azure, we might want to send 'input_audio_buffer.clear' but VAD usually handles it
      if (AI_CONFIG.provider === 'AZURE' && azureSocketRef.current?.readyState === WebSocket.OPEN) {
         azureSocketRef.current.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
      }
  };

  const handleRemoteClose = () => {
      console.log("Session closed from server");
      if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.PAUSED) {
        setConnectionState(ConnectionState.DISCONNECTED);
      }
  };

  const disconnect = async () => {
    // 1. Clear session refs
    liveSessionRef.current = null;
    if (azureSocketRef.current) {
        azureSocketRef.current.close();
        azureSocketRef.current = null;
    }
    
    // 2. Stop Microphone Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 3. Disconnect Script Processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // 4. Close Audio Contexts
    const closeContext = async (ctx: AudioContext | null) => {
       if (ctx && ctx.state !== 'closed') {
         try { await ctx.close(); } catch(e) { console.warn("Error closing context", e); }
       }
    };
    await closeContext(audioContextRef.current.input);
    await closeContext(audioContextRef.current.output);
    audioContextRef.current = { input: null, output: null };

    // 5. Stop any playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    setConnectionState(ConnectionState.DISCONNECTED);
    setAudioLevel(0);
    isPausedRef.current = false;
    inputBufferRef.current = "";
    outputBufferRef.current = "";
    
    // Explicit save on disconnect
    if (transcriptRef.current || uploadedContextRef.current) saveSession();
  };

  const togglePause = async () => {
    if (connectionState === ConnectionState.CONNECTED) {
      // Pause
      isPausedRef.current = true;
      setConnectionState(ConnectionState.PAUSED);
      if (audioContextRef.current.input?.state === 'running') await audioContextRef.current.input.suspend();
      if (audioContextRef.current.output?.state === 'running') await audioContextRef.current.output.suspend();
    } else if (connectionState === ConnectionState.PAUSED) {
      // Resume
      isPausedRef.current = false;
      setConnectionState(ConnectionState.CONNECTED);
      if (audioContextRef.current.input?.state === 'suspended') await audioContextRef.current.input.resume();
      if (audioContextRef.current.output?.state === 'suspended') await audioContextRef.current.output.resume();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Please upload text documents under 5MB.");
      return;
    }

    if (isAnalyzingRef.current) {
      setError("Analysis currently in progress. Please wait.");
      return;
    }

    try {
      isAnalyzingRef.current = true;
      const text = await file.text();
      uploadedContextRef.current += `\n\n=== UPLOADED DOCUMENT: ${file.name} ===\n${text}`;
      
      saveSession();

      setActiveAgent(AgentRole.ANALYST);
      await new Promise(r => setTimeout(r, 600)); 

      const updatedSession = await analyzeConversation(text, sessionData);
      setSessionData(updatedSession);

      setActiveAgent(AgentRole.VALIDATOR);
      await new Promise(r => setTimeout(r, 600)); 
      
    } catch (e) {
      console.error(e);
      setError("Failed to read or analyze file.");
    } finally {
      isAnalyzingRef.current = false;
      setActiveAgent(AgentRole.CONVERSATION);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const performAnalysis = async () => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;

    try {
      setActiveAgent(AgentRole.ANALYST);
      await new Promise(r => setTimeout(r, 600));

      const updatedSession = await analyzeConversation(transcriptRef.current, sessionData);
      setSessionData(updatedSession);
      
      setActiveAgent(AgentRole.VALIDATOR);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.warn("Analysis background update failed:", err);
    } finally {
      setActiveAgent(AgentRole.CONVERSATION);
      isAnalyzingRef.current = false;
    }
  };

  const handleInjectData = (type: 'basic' | 'intermediate' | 'advanced') => {
    let newData = { ...sessionData };
    if (type === 'basic') {
      newData.completeness_percentage = 30;
      newData.artifacts.project_charter.fields.problem_statement = { value: "The current manual spreadsheet process is slow.", captured_at: new Date().toISOString(), confirmed: true, discussion_status: 'captured' };
    } 
    // ... keep existing injection logic simple for brevity, it's dev tool
    setSessionData(newData);
  };

  // --- Render Logic ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!activeProfile) {
    return <LandingPage profiles={ConfigManager.getAllProfiles()} onSelectProfile={handleProfileSelect} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Resume Modal */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-6 animate-fadeIn">
             <div className="flex items-center gap-3 mb-4 text-blue-400">
               <History className="w-8 h-8" />
               <h2 className="text-xl font-bold text-white">Resume Session?</h2>
             </div>
             <p className="text-slate-300 mb-6">
               We found a saved interview session. Would you like to pick up where you left off?
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={clearSession}
                 className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors font-medium flex items-center justify-center gap-2"
               >
                 <Trash2 className="w-4 h-4" /> Start New
               </button>
               <button 
                 onClick={loadSession}
                 className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-bold shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
               >
                 <History className="w-4 h-4" /> Resume
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button onClick={() => setActiveProfile(null)} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
               <ChevronLeft className="w-5 h-5" />
             </button>
             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40 flex-shrink-0">
                <span className="text-white font-bold text-xl">IA</span>
             </div>
             <div className="min-w-0">
               <h1 className="text-xl font-bold text-white tracking-tight truncate">IntakeAI</h1>
               <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`px-1.5 py-0.5 rounded bg-${activeProfile.color}-900/30 text-${activeProfile.color}-400 border border-${activeProfile.color}-900/50 uppercase font-bold tracking-wider`}>
                    {activeProfile.role}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 text-[10px] uppercase">
                     {AI_CONFIG.provider}
                  </span>
                  {isSavingToCloud && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/50">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                    </span>
                  )}
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
             {/* User Info (Added) */}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                   {currentUser.avatar || 'U'}
                </div>
                <span className="text-xs text-slate-400 font-medium truncate max-w-[100px]">{currentUser.name}</span>
             </div>

            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2 px-3 py-1 bg-red-900/20 rounded-full border border-red-900/50 max-w-[200px] truncate">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{error}</span>
              </div>
            )}
            
            {connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR ? (
              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                  title="Upload transcripts or project docs"
                 >
                   <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload Context</span>
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".txt,.md,.json,.csv,.xml" 
                    onChange={handleFileUpload} 
                 />

                {hasSavedSession && !showResumeModal && (
                  <button onClick={() => setShowResumeModal(true)} className="text-xs text-blue-400 underline hover:text-blue-300">
                    Recover Session
                  </button>
                )}
                <button 
                  onClick={connectToAI}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95 whitespace-nowrap"
                >
                  <Mic className="w-4 h-4" /> {transcriptRef.current ? "Resume Interview" : "Start Interview"}
                </button>
                
                {/* Logout Button (Added) */}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                  title="Sign Out & Auto-Save"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                 <button 
                  onClick={togglePause}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold transition-all border whitespace-nowrap ${
                    connectionState === ConnectionState.PAUSED 
                      ? 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-200 border-yellow-800' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                  }`}
                 >
                   {connectionState === ConnectionState.PAUSED ? (
                     <>
                       <Play className="w-4 h-4" /> Resume
                     </>
                   ) : (
                     <>
                       <Pause className="w-4 h-4" /> Pause
                     </>
                   )}
                 </button>

                 <button 
                  onClick={handleExitSession}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-2.5 rounded-full font-semibold transition-all whitespace-nowrap"
                  title="Save and Exit"
                 >
                  <Save className="w-4 h-4" /> Exit
                 </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interaction & Progress (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-1">
          <AgentStatus activeAgent={activeAgent} />

          <div className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center border border-slate-700 shadow-xl min-h-[300px] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50 pointer-events-none" />
             
             <VoiceVisualizer 
                connectionState={connectionState} 
                isSpeaking={audioLevel > 0.05} 
                volume={audioLevel} 
             />
             
             <div className="mt-8 text-center z-10">
               {connectionState === ConnectionState.CONNECTED ? (
                 <p className="text-blue-400 font-medium animate-pulse">Listening...</p>
               ) : connectionState === ConnectionState.PAUSED ? (
                 <p className="text-yellow-500 font-medium">Session Paused</p>
               ) : (
                 <p className="text-slate-500">Ready to start</p>
               )}
               <p className="text-slate-600 text-xs mt-2 max-w-[200px] mx-auto">
                 {activeProfile.name} is ready to capture your requirements.
               </p>
             </div>
          </div>

          <ProgressTracker overallProgress={sessionData.completeness_percentage} sessionData={sessionData} />
        </div>

        {/* Right Column: Artifacts (8 cols) */}
        <div className="lg:col-span-8 h-[600px] lg:h-[calc(100vh-140px)] min-h-[500px] order-1 lg:order-2">
          <ArtifactViewer sessionData={sessionData} />
        </div>

      </main>

      <DevPanel 
        onInjectData={handleInjectData} 
        onSimulateRound={() => performAnalysis()} 
        onReset={clearSession} 
      />
    </div>
  );
};

export default App;