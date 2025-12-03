
import React, { useState } from 'react';
import { FullSessionExport, ProjectCharter, RequirementsArtifact, UserStoriesArtifact, CharterField, PRDEnhancements } from '../types';
import { uploadSessionToCloud } from '../services/storageService';
import { 
  FileText, Target, ListTodo, AlertTriangle, CheckSquare, 
  Layers, Database, Activity, Code, Clock, Users, Shield, Zap,
  LucideIcon, BookOpen, CloudUpload, Loader2, CheckCircle, XCircle
} from 'lucide-react';

interface ArtifactViewerProps {
  sessionData: FullSessionExport;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ sessionData }) => {
  const [activeTab, setActiveTab] = useState<'charter' | 'requirements' | 'stories' | 'prd' | 'report' | 'json'>('charter');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const { artifacts } = sessionData || {};

  const handleCloudUpload = async () => {
    if (uploadStatus === 'uploading') return;
    
    setUploadStatus('uploading');
    setUploadMessage('Pushing to Azure Storage...');
    
    try {
      // Simulate min delay for UX if network is too fast
      const startTime = Date.now();
      const result = await uploadSessionToCloud(sessionData);
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));

      if (result.success) {
        setUploadStatus('success');
        setUploadMessage(`Exported GUID: ${result.guid}`);
        // Reset status after a few seconds
        setTimeout(() => {
           setUploadStatus('idle');
           setUploadMessage('');
        }, 5000);
      } else {
        setUploadStatus('error');
        setUploadMessage(result.message);
      }
    } catch (e) {
      setUploadStatus('error');
      setUploadMessage('Unexpected error occurred');
    }
  };

  // Defensive check: if artifacts is undefined or null, show loading or empty state
  if (!artifacts) {
    return (
      <div className="flex flex-col h-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-2xl items-center justify-center p-8 text-slate-500">
        <AlertTriangle className="w-10 h-10 mb-3 opacity-50" />
        <p>Artifact data not yet available.</p>
      </div>
    );
  }

  // Safe destructuring with fallbacks
  const { 
    project_charter = { status: '', fields: {} } as any, 
    requirements = { status: '', functional: [], non_functional: { performance: [], security: [], reliability: [], usability: [], scalability: [] } } as any, 
    user_stories = { status: '', stories: [] } as any, 
    prd_enhancements = { status: '', success_metrics: { kpis: [] }, data_requirements: { data_elements: [] } } as any 
  } = artifacts || {};

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-700 bg-slate-900/50">
        <div className="flex overflow-x-auto scrollbar-hide flex-1">
          <TabButton id="charter" label="Charter" icon={FileText} active={activeTab} onClick={setActiveTab} />
          <TabButton id="requirements" label="Requirements" icon={CheckSquare} active={activeTab} onClick={setActiveTab} />
          <TabButton id="stories" label="Stories" icon={ListTodo} active={activeTab} onClick={setActiveTab} />
          <TabButton id="prd" label="PRD Data" icon={Layers} active={activeTab} onClick={setActiveTab} />
          <div className="w-px bg-slate-700 mx-1 h-8 self-center hidden md:block" />
          <TabButton id="report" label="Report" icon={BookOpen} active={activeTab} onClick={setActiveTab} />
          <TabButton id="json" label="JSON Export" icon={Code} active={activeTab} onClick={setActiveTab} />
        </div>
        
        {/* Cloud Upload Action */}
        <div className="px-2 py-1 md:pr-4 flex items-center">
           {uploadStatus !== 'idle' ? (
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${
               uploadStatus === 'uploading' ? 'bg-blue-900/30 text-blue-300' :
               uploadStatus === 'success' ? 'bg-emerald-900/30 text-emerald-400' :
               'bg-red-900/30 text-red-400'
             }`}>
                {uploadStatus === 'uploading' && <Loader2 className="w-3 h-3 animate-spin" />}
                {uploadStatus === 'success' && <CheckCircle className="w-3 h-3" />}
                {uploadStatus === 'error' && <XCircle className="w-3 h-3" />}
                <span className="max-w-[150px] truncate">{uploadMessage}</span>
             </div>
           ) : (
             <button 
               onClick={handleCloudUpload}
               className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20"
               title="Push JSON and Doc to Azure Storage"
             >
               <CloudUpload className="w-3.5 h-3.5" /> 
               <span className="hidden md:inline">Push to Cloud</span>
             </button>
           )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-900/50">
        
        {activeTab === 'charter' && project_charter.fields && <CharterView charter={project_charter} />}
        
        {activeTab === 'requirements' && <RequirementsView requirements={requirements} />}
        
        {activeTab === 'stories' && <StoriesView stories={user_stories} />}
        
        {activeTab === 'prd' && <PRDView prd={prd_enhancements} />}
        
        {activeTab === 'report' && <ReportView data={sessionData} />}

        {activeTab === 'json' && (
           <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-auto h-full max-w-full font-mono text-xs text-green-400">
             <pre className="whitespace-pre-wrap break-all">{JSON.stringify(sessionData, null, 2)}</pre>
           </div>
        )}

      </div>
    </div>
  );
};

// --- Report View Component ---

const ReportView = ({ data }: { data: FullSessionExport }) => {
  const f = data.artifacts?.project_charter?.fields;
  const reqs = data.artifacts?.requirements;
  const stories = data.artifacts?.user_stories?.stories;
  
  return (
    <div className="bg-white text-slate-900 p-8 md:p-12 rounded shadow-2xl max-w-4xl mx-auto min-h-full animate-fadeIn font-serif">
      
      {/* Header */}
      <div className="border-b-2 border-slate-800 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Project Intake Specification</h1>
          <p className="text-slate-500 italic">Generated by IntakeAI Agent</p>
        </div>
        <div className="text-right text-sm text-slate-500 font-mono">
          <div className="mb-1">ID: {data.session_id}</div>
          <div>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
         <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-sans">Completeness</div>
            <div className="text-2xl font-bold text-blue-700 font-sans">{Math.round(data.completeness_percentage)}%</div>
         </div>
         <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-sans">Stories</div>
            <div className="text-2xl font-bold text-slate-800 font-sans">{data.summary?.stats?.user_stories_count || 0}</div>
         </div>
         <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-sans">Requirements</div>
            <div className="text-2xl font-bold text-slate-800 font-sans">{data.summary?.stats?.requirements_count || 0}</div>
         </div>
         <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-sans">Quality</div>
            <div className="text-lg font-bold text-emerald-700 font-sans uppercase mt-1">{data.data_quality?.replace('_', ' ') || 'N/A'}</div>
         </div>
      </div>

      {/* 1. Charter */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase tracking-wider text-slate-800 font-sans">1. Project Charter</h2>
        
        <ReportField label="Problem Statement" value={f?.problem_statement?.value} />
        <ReportField label="Business Objectives" value={f?.business_objectives?.value} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
           <div>
              <h4 className="font-bold text-slate-700 font-sans text-sm uppercase mb-2">Scope Inclusions</h4>
              <p className="text-slate-800 leading-relaxed text-sm whitespace-pre-wrap">{f?.scope_inclusions?.value || 'N/A'}</p>
           </div>
           <div>
              <h4 className="font-bold text-slate-700 font-sans text-sm uppercase mb-2">Key Stakeholders</h4>
              <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
                {f?.key_stakeholders?.value?.map((s,i) => <li key={i}>{s}</li>) || <li>N/A</li>}
              </ul>
           </div>
        </div>
      </section>

      {/* 2. Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase tracking-wider text-slate-800 font-sans">2. Functional Requirements</h2>
        <div className="overflow-hidden rounded border border-slate-200">
           <table className="w-full text-sm text-left">
             <thead className="bg-slate-100 font-sans font-bold text-slate-700">
               <tr>
                 <th className="p-3 border-b">ID</th>
                 <th className="p-3 border-b">Description</th>
                 <th className="p-3 border-b w-24">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {reqs?.functional?.length === 0 && <tr><td colSpan={3} className="p-4 text-center italic text-slate-500">No requirements captured.</td></tr>}
                {reqs?.functional?.map((req, i) => (
                  <tr key={i}>
                    <td className="p-3 font-mono text-xs text-slate-500 align-top">{req.id}</td>
                    <td className="p-3 text-slate-800 align-top">{req.description}</td>
                    <td className="p-3 align-top">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">
                        {req.confirmed ? 'Confirmed' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
             </tbody>
           </table>
        </div>
      </section>

      {/* 3. User Stories */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase tracking-wider text-slate-800 font-sans">3. User Stories</h2>
        <div className="space-y-4">
          {stories?.length === 0 && <p className="italic text-slate-500">No user stories captured.</p>}
          {stories?.map((story, i) => (
            <div key={i} className="border border-slate-200 rounded p-4 break-inside-avoid">
               <div className="flex justify-between items-start mb-2">
                 <span className="font-mono text-xs text-blue-600 font-bold">{story.id}</span>
                 <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{story.priority?.replace('_', ' ')}</span>
               </div>
               <div className="mb-3 text-slate-900 font-medium">
                  As a <span className="text-blue-700">{story.as_a}</span>, I want to <span className="text-blue-700">{story.i_want}</span>, so that <span className="text-blue-700">{story.so_that}</span>.
               </div>
               {story.acceptance_criteria?.length > 0 && (
                 <div className="bg-slate-50 p-3 rounded text-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase">Acceptance Criteria</span>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-700">
                      {story.acceptance_criteria.map((ac, j) => <li key={j}>{ac}</li>)}
                    </ul>
                 </div>
               )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Non-Functional */}
      <section className="break-inside-avoid">
         <h2 className="text-2xl font-bold border-b border-slate-300 pb-2 mb-4 uppercase tracking-wider text-slate-800 font-sans">4. Non-Functional Requirements</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <ReportList title="Security" items={reqs?.non_functional?.security} />
            <ReportList title="Performance" items={reqs?.non_functional?.performance} />
            <ReportList title="Reliability" items={reqs?.non_functional?.reliability} />
            <ReportList title="Usability" items={reqs?.non_functional?.usability} />
         </div>
      </section>

      <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs font-sans">
        End of Document • IntakeAI Generated Report
      </div>
    </div>
  );
};

const ReportField = ({ label, value }: { label: string, value: string | null | undefined }) => (
  <div className="mb-4">
    <h4 className="font-bold text-slate-700 font-sans text-sm uppercase mb-1">{label}</h4>
    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{value || <span className="italic text-slate-400">Not captured</span>}</p>
  </div>
);

const ReportList = ({ title, items }: { title: string, items: string[] | undefined }) => (
  <div>
    <h4 className="font-bold text-slate-700 font-sans text-xs uppercase mb-1 border-b border-slate-200 pb-1">{title}</h4>
    <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1 mt-2">
      {!items || items.length === 0 ? <li className="italic text-slate-400">None</li> : items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  </div>
);

// --- Sub Components ---

interface TabButtonProps {
  id: string;
  label: string;
  icon: LucideIcon;
  active: string;
  onClick: (id: any) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium transition-all whitespace-nowrap border-b-2 flex-shrink-0 ${
      active === id 
        ? 'bg-slate-800 text-blue-400 border-blue-400' 
        : 'bg-slate-900 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const CharterView = ({ charter }: { charter: ProjectCharter }) => {
  const f = charter.fields;
  if (!f) return <div className="text-slate-500 italic p-4">Initializing charter...</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn">
       <CharterCard title="Problem Statement" icon={AlertTriangle} field={f.problem_statement} fullWidth />
       <CharterCard title="Business Objectives" icon={Target} field={f.business_objectives} />
       <CharterCard title="Scope Inclusions" icon={CheckSquare} field={f.scope_inclusions} />
       <CharterCard title="Constraints" icon={Shield} field={f.constraints} />
       <CharterCard title="Target Timeline" icon={Clock} field={f.target_timeline} />
       <CharterListCard title="Scope Exclusions" items={f.scope_exclusions?.value} status={f.scope_exclusions?.discussion_status} />
       <CharterListCard title="Assumptions" items={f.assumptions?.value} status={f.assumptions?.discussion_status} />
       <CharterListCard title="Key Stakeholders" items={f.key_stakeholders?.value} status={f.key_stakeholders?.discussion_status} />
    </div>
  );
};

interface CharterCardProps {
  title: string;
  icon: LucideIcon;
  field: CharterField<string | null>;
  fullWidth?: boolean;
}

const CharterCard: React.FC<CharterCardProps> = ({ title, icon: Icon, field, fullWidth }) => (
  <div className={`p-5 bg-slate-800 rounded-lg border border-slate-700 shadow-sm ${fullWidth ? 'xl:col-span-2' : ''} flex flex-col min-w-0`}>
    <div className="flex justify-between items-start mb-3 gap-4">
      <h3 className="text-slate-200 font-semibold flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" /> 
        <span className="truncate">{title}</span>
      </h3>
      <div className="flex-shrink-0">
        <StatusBadge status={field?.discussion_status} />
      </div>
    </div>
    <div className="text-slate-400 text-sm leading-relaxed break-words whitespace-pre-wrap min-w-0">
      {field?.value || <span className="italic text-slate-600">Pending discussion...</span>}
    </div>
  </div>
);

interface CharterListCardProps {
  title: string;
  items: string[];
  status: string;
}

const CharterListCard: React.FC<CharterListCardProps> = ({ title, items, status }) => (
  <div className="p-5 bg-slate-800 rounded-lg border border-slate-700 shadow-sm flex flex-col min-w-0">
    <div className="flex justify-between items-start mb-3 gap-4">
      <h3 className="text-slate-200 font-semibold flex items-center gap-2 min-w-0">
        <Users className="w-4 h-4 text-purple-400 flex-shrink-0" /> 
        <span className="truncate">{title}</span>
      </h3>
      <div className="flex-shrink-0">
        <StatusBadge status={status} />
      </div>
    </div>
    {items && items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((item: string, i: number) => (
          <li key={i} className="text-slate-400 text-sm flex gap-2 items-start min-w-0">
            <span className="text-slate-600 mt-1 flex-shrink-0">•</span> 
            <span className="break-words min-w-0 flex-1">{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <span className="italic text-slate-600 text-sm">None identified yet</span>
    )}
  </div>
);

const RequirementsView = ({ requirements }: { requirements: RequirementsArtifact }) => {
  if (!requirements?.functional) return <div className="text-slate-500 italic p-4">Initializing requirements...</div>;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Functional */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> Functional Requirements
        </h3>
        <div className="grid gap-3">
          {requirements.functional.length === 0 && <p className="text-slate-500 italic">No functional requirements captured yet.</p>}
          {requirements.functional.map((req) => (
            <div key={req.id} className="flex gap-4 p-4 bg-slate-800 border border-slate-700 rounded-lg items-start hover:border-blue-500/50 transition-colors min-w-0">
              <span className="px-2 py-1 bg-slate-900 rounded text-xs font-mono text-blue-400 border border-slate-700 h-fit flex-shrink-0 whitespace-nowrap">
                {req.id}
              </span>
              <p className="text-slate-300 text-sm flex-1 break-words min-w-0 whitespace-pre-wrap">{req.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Functional */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Non-Functional Requirements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NFRGroup title="Security" items={requirements.non_functional?.security || []} />
          <NFRGroup title="Performance" items={requirements.non_functional?.performance || []} />
          <NFRGroup title="Reliability" items={requirements.non_functional?.reliability || []} />
          <NFRGroup title="Usability" items={requirements.non_functional?.usability || []} />
        </div>
      </div>
    </div>
  );
};

interface NFRGroupProps {
  title: string;
  items: string[];
}

const NFRGroup: React.FC<NFRGroupProps> = ({ title, items }) => (
  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 min-w-0">
    <h4 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide truncate">{title}</h4>
    {items && items.length > 0 ? (
      <ul className="list-disc pl-4 space-y-1">
        {items.map((it: string, i: number) => (
          <li key={i} className="text-xs text-slate-400 break-words">{it}</li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-slate-600 italic">None</p>
    )}
  </div>
);

const StoriesView = ({ stories }: { stories: UserStoriesArtifact }) => {
  if (!stories?.stories) return <div className="text-slate-500 italic p-4">Initializing stories...</div>;

  return (
    <div className="space-y-4 animate-fadeIn">
      {stories.stories.length === 0 && (
         <div className="text-center p-12 text-slate-500 italic border border-dashed border-slate-700 rounded-xl">
           No user stories identified yet. Continue the conversation to generate stories.
         </div>
      )}
      {stories.stories.map((story) => (
        <div key={story.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-all min-w-0">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="flex items-center gap-3 flex-wrap">
               <span className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs font-mono rounded border border-blue-900/50 flex-shrink-0">
                 {story.id}
               </span>
               <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${
                 story.priority === 'must_have' ? 'bg-red-900/20 text-red-400 border-red-900/30' : 
                 story.priority === 'should_have' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/30' :
                 'bg-slate-700 text-slate-400 border-slate-600'
               }`}>
                 {story.priority.replace('_', ' ')}
               </span>
            </div>
            {story.story_points && (
               <div className="text-xs text-slate-500 font-mono flex-shrink-0">
                 {story.story_points} pts
               </div>
            )}
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex gap-2 text-sm text-slate-300 items-start">
              <span className="font-bold text-slate-500 min-w-[60px] flex-shrink-0 mt-0.5">As a</span>
              <span className="break-words min-w-0 flex-1">{story.as_a}</span>
            </div>
            <div className="flex gap-2 text-sm text-slate-300 items-start">
              <span className="font-bold text-slate-500 min-w-[60px] flex-shrink-0 mt-0.5">I want</span>
              <span className="break-words min-w-0 flex-1">{story.i_want}</span>
            </div>
            <div className="flex gap-2 text-sm text-slate-300 items-start">
              <span className="font-bold text-slate-500 min-w-[60px] flex-shrink-0 mt-0.5">So that</span>
              <span className="break-words min-w-0 flex-1">{story.so_that}</span>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Acceptance Criteria</h4>
            <ul className="space-y-1.5">
              {story.acceptance_criteria && story.acceptance_criteria.map((ac, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2 min-w-0">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  <span className="break-words min-w-0 flex-1">{ac}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

const PRDView = ({ prd }: { prd: PRDEnhancements }) => {
  if (!prd?.success_metrics) return <div className="text-slate-500 italic p-4">Initializing PRD data...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
      <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col min-w-0">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-pink-400 flex-shrink-0" /> Success Metrics
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-slate-500 uppercase">KPIs</span>
            {prd.success_metrics.kpis && prd.success_metrics.kpis.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-300">
                {prd.success_metrics.kpis.map((k:string, i:number)=> <li key={i} className="break-words">{k}</li>)}
              </ul>
            ) : <p className="text-xs text-slate-600 italic mt-1">None</p>}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col min-w-0">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Data Requirements
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-slate-500 uppercase">Data Elements</span>
             {prd.data_requirements.data_elements && prd.data_requirements.data_elements.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-300">
                {prd.data_requirements.data_elements.map((k:string, i:number)=> <li key={i} className="break-words">{k}</li>)}
              </ul>
            ) : <p className="text-xs text-slate-600 italic mt-1">None</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    captured: 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50',
    in_progress: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
    never_asked: 'bg-slate-700/50 text-slate-500 border-slate-700',
    skipped: 'bg-yellow-900/20 text-yellow-600 border-yellow-900/20'
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider border whitespace-nowrap ${styles[status] || styles.never_asked}`}>
      {status?.replace('_', ' ') || 'Pending'}
    </span>
  );
};
