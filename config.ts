

// --- DEVELOPER OVERRIDES ---
// Use this section to hardcode values for local development.
// These values will take precedence over environment variables (.env).
// LEAVE EMPTY to use environment variables (Recommended for production).
const DEV_OVERRIDES = {
  // Set to 'GEMINI' or 'AZURE'
  PROVIDER: 'AZURE', 

  // Google Gemini Configuration
  GEMINI_API_KEY: '', 
  GEMINI_LIVE_MODEL: 'gemini-2.5-flash-native-audio-preview-09-2025',
  GEMINI_ANALYSIS_MODEL: 'gemini-2.5-flash',
  GEMINI_VOICE_NAME: 'Kore',

  // Azure OpenAI Configuration
  AZURE_OPENAI_API_KEY: '', 
  AZURE_OPENAI_ENDPOINT: '', // e.g. https://my-resource.openai.azure.com/
  AZURE_OPENAI_DEPLOYMENT: 'gpt-4o-realtime-preview',
  AZURE_OPENAI_ANALYSIS_DEPLOYMENT: 'gpt-4o',
  AZURE_VOICE_NAME: 'alloy',
  AZURE_API_VERSION: '2024-10-01-preview',
  AZURE_STORAGE_ENDPOINT: '', 

  // Authentication (Entra ID)
  // Leave Client ID empty to disable Auth and use Development Mode
  AZURE_CLIENT_ID: '', 
  AZURE_TENANT_ID: '',
};

// ------------------------------------------------------------------

// Helper to get environment variable from Runtime (window.env) or Build time (process.env)
const getEnv = (key: keyof NonNullable<Window['env']> | string, fallback: string = ''): string => {
  // 1. Check Developer Overrides first
  if (key === 'API_KEY' && DEV_OVERRIDES.GEMINI_API_KEY) return DEV_OVERRIDES.GEMINI_API_KEY;
  if (key === 'AZURE_OPENAI_API_KEY' && DEV_OVERRIDES.AZURE_OPENAI_API_KEY) return DEV_OVERRIDES.AZURE_OPENAI_API_KEY;
  if (key === 'AZURE_OPENAI_ENDPOINT' && DEV_OVERRIDES.AZURE_OPENAI_ENDPOINT) return DEV_OVERRIDES.AZURE_OPENAI_ENDPOINT;
  if (key === 'AZURE_OPENAI_DEPLOYMENT' && DEV_OVERRIDES.AZURE_OPENAI_DEPLOYMENT) return DEV_OVERRIDES.AZURE_OPENAI_DEPLOYMENT;
  if (key === 'AZURE_OPENAI_ANALYSIS_DEPLOYMENT' && DEV_OVERRIDES.AZURE_OPENAI_ANALYSIS_DEPLOYMENT) return DEV_OVERRIDES.AZURE_OPENAI_ANALYSIS_DEPLOYMENT;
  if (key === 'AZURE_CLIENT_ID' && DEV_OVERRIDES.AZURE_CLIENT_ID) return DEV_OVERRIDES.AZURE_CLIENT_ID;
  if (key === 'AZURE_TENANT_ID' && DEV_OVERRIDES.AZURE_TENANT_ID) return DEV_OVERRIDES.AZURE_TENANT_ID;
  if (key === 'REACT_APP_STORAGE_ENDPOINT' && DEV_OVERRIDES.AZURE_STORAGE_ENDPOINT) return DEV_OVERRIDES.AZURE_STORAGE_ENDPOINT;

  // 2. Check Runtime Environment (Azure App Service)
  if (typeof window !== 'undefined' && window.env && key in window.env) {
    const val = (window.env as any)[key];
    if (val) return val;
  }

  // 3. Check Build Time Environment (.env)
  return (process.env as any)[key] || fallback;
};

// Logic to determine provider
const getProvider = (): 'GEMINI' | 'AZURE' => {
  if (DEV_OVERRIDES.PROVIDER && (DEV_OVERRIDES.PROVIDER === 'GEMINI' || DEV_OVERRIDES.PROVIDER === 'AZURE')) {
    return DEV_OVERRIDES.PROVIDER;
  }
  return (process.env.REACT_APP_PROVIDER as 'GEMINI' | 'AZURE') || 'AZURE';
};

export const AI_CONFIG = {
  // Current active provider.
  provider: getProvider(), 

  // Google Gemini Configuration
  gemini: {
    apiKey: getEnv('API_KEY'),
    liveModel: DEV_OVERRIDES.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-09-2025',
    analysisModel: DEV_OVERRIDES.GEMINI_ANALYSIS_MODEL || 'gemini-2.5-flash',
    voiceName: DEV_OVERRIDES.GEMINI_VOICE_NAME || 'Kore'
  },

  // Azure OpenAI Configuration
  azure: {
    apiKey: getEnv('AZURE_OPENAI_API_KEY'),
    endpoint: getEnv('AZURE_OPENAI_ENDPOINT'), // e.g., https://my-resource.openai.azure.com/
    // Primary Deployment (Realtime API)
    deploymentName: getEnv('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o-realtime-preview'), 
    // Analysis Deployment (Chat Completions) - falls back to primary if not set
    analysisDeploymentName: getEnv('AZURE_OPENAI_ANALYSIS_DEPLOYMENT') || getEnv('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o',
    voiceName: DEV_OVERRIDES.AZURE_VOICE_NAME || 'alloy',
    apiVersion: DEV_OVERRIDES.AZURE_API_VERSION || '2024-10-01-preview',
    // Azure Function endpoint for saving repository files
    storageEndpoint: getEnv('REACT_APP_STORAGE_ENDPOINT', 'https://placeholder-func.azurewebsites.net/api/uploadSession') 
  },

  // Entra ID (Azure AD) Configuration
  auth: {
    // Auto-enable auth if the Client ID is provided
    enabled: !!(getEnv('AZURE_CLIENT_ID') && getEnv('AZURE_CLIENT_ID') !== '00000000-0000-0000-0000-000000000000'), 
    clientId: getEnv('AZURE_CLIENT_ID') || '00000000-0000-0000-0000-000000000000',
    authority: `https://login.microsoftonline.com/${getEnv('AZURE_TENANT_ID') || 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : ''
  }
};

export const getAnalysisModelName = () => {
  return AI_CONFIG.provider === 'GEMINI' ? AI_CONFIG.gemini.analysisModel : AI_CONFIG.azure.analysisDeploymentName;
};

export const getLiveModelName = () => {
  return AI_CONFIG.provider === 'GEMINI' ? AI_CONFIG.gemini.liveModel : AI_CONFIG.azure.deploymentName;
};

// --- Profile & Config Manager ---

export interface ProfileConfig {
  id: string;
  name: string;
  role: string; // The specific agent role title
  description: string;
  systemInstruction: string;
  isAvailable: boolean;
  color: string;
  iconName: 'Briefcase' | 'TrendingUp' | 'Target'; 
}

const BA_INSTRUCTION = `
You are an expert Business Analyst Intake Agent (IA). 
Your goal is to conduct a structured project intake interview to build a Project Charter, Requirements, and User Stories.

PHASE 1: CHARTER
- Ask for the Problem Statement.
- Ask for Business Objectives and Success Metrics.
- Identify Stakeholders.
- Clarify Constraints, Budget, and Timeline.

PHASE 2: REQUIREMENTS & STORIES
- Ask "Who are the users?" (Personas)
- For each persona, ask "What do they need to do?" (User Stories).
- Dig for Acceptance Criteria ("How will we know this is working?").
- Ask about functional and non-functional requirements (Performance, Security).

BEHAVIOR:
- Ask one or two questions at a time.
- Be progressive. Don't ask for everything at once.
- If the user is vague, propose options.
`;

export class ConfigManager {
  private static profiles: ProfileConfig[] = [
    {
      id: 'business_analyst',
      name: 'Business Analyst',
      role: 'Requirements Specialist',
      description: 'Conducts structured project intake, gathering detailed requirements, user stories, and charter definitions.',
      systemInstruction: BA_INSTRUCTION,
      isAvailable: true,
      color: 'blue',
      iconName: 'Briefcase'
    },
    {
      id: 'value_office',
      name: 'Value Office',
      role: 'Value Architect',
      description: 'Focuses on ROI analysis, strategic alignment, and defining value realization metrics for the portfolio.',
      systemInstruction: 'You are a Value Office Agent. Focus on ROI and Strategy.',
      isAvailable: false,
      color: 'emerald',
      iconName: 'TrendingUp'
    },
    {
      id: 'product_manager',
      name: 'Product Manager',
      role: 'Product Owner',
      description: 'Builds product roadmaps, prioritizes features based on market fit, and defines customer journeys.',
      systemInstruction: 'You are a Product Manager Agent. Focus on Roadmaps and Market Fit.',
      isAvailable: false,
      color: 'purple',
      iconName: 'Target'
    }
  ];

  static getAllProfiles(): ProfileConfig[] {
    return this.profiles;
  }

  static getProfile(id: string): ProfileConfig | undefined {
    return this.profiles.find(p => p.id === id);
  }
}
