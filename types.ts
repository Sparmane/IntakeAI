

export enum AgentRole {
  CONVERSATION = 'Conversation Agent',
  ANALYST = 'Requirements Analyst',
  VALIDATOR = 'Data Validator'
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAuthenticated: boolean;
}

// --- Detailed Schema Types ---

export interface CharterField<T> {
  captured_at: string | null;
  confirmed: boolean;
  discussion_status: 'never_asked' | 'captured' | 'skipped' | 'in_progress';
  value: T;
}

export interface ProjectCharter {
  status: string;
  fields: {
    problem_statement: CharterField<string>;
    business_objectives: CharterField<string>;
    scope_inclusions: CharterField<string>;
    scope_exclusions: CharterField<string[]>;
    assumptions: CharterField<string[]>;
    constraints: CharterField<string>;
    budget_range: CharterField<string | null>;
    key_stakeholders: CharterField<string[]>;
    success_criteria: CharterField<string[]>;
    target_timeline: CharterField<string>;
  };
}

export interface FunctionalRequirement {
  id: string;
  description: string;
  captured_at: string;
  confirmed: boolean;
}

export interface RequirementsArtifact {
  status: string;
  functional: FunctionalRequirement[];
  integration_points: string[];
  non_functional: {
    performance: string[];
    security: string[];
    reliability: string[];
    usability: string[];
    scalability: string[];
  };
  technical_constraints: string[];
}

export interface UserStory {
  id: string;
  as_a: string;
  i_want: string;
  so_that: string;
  acceptance_criteria: string[];
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  story_points: number | null;
  captured_at: string;
  confirmed: boolean;
}

export interface UserStoriesArtifact {
  status: string;
  stories: UserStory[];
}

export interface PRDEnhancements {
  status: string;
  business_rules: { discussion_status: string; rules: string[] };
  data_requirements: { discussion_status: string; data_elements: string[]; integration_needs: string[] };
  success_metrics: { discussion_status: string; kpis: string[]; analytics_requirements: string[] };
  user_journeys: { discussion_status: string; journeys: string[] };
  user_personas: { discussion_status: string; personas: string[] };
}

export interface Artifacts {
  project_charter: ProjectCharter;
  requirements: RequirementsArtifact;
  user_stories: UserStoriesArtifact;
  prd_enhancements: PRDEnhancements;
  acceptance_criteria: {
    status: string;
    global_criteria: string[];
    story_criteria: Record<string, string[]>;
  };
}

export interface SessionSummary {
  completion_percentage: number;
  last_updated: string;
  project_id: string;
  stats: {
    charter_fields_captured: number;
    requirements_count: number;
    user_stories_count: number;
  };
}

export interface FullSessionExport {
  session_id: string;
  completion_timestamp: string | null;
  completeness_percentage: number;
  data_quality: string;
  artifacts: Artifacts;
  summary: SessionSummary;
  next_stage_instructions: {
    description: string;
    usage: string;
    completeness: string;
  };
}

export interface AppState {
  connectionState: ConnectionState;
  activeAgent: AgentRole;
  messages: Message[];
  sessionData: FullSessionExport;
  audioLevel: number;
}

// Global Window Interface for Runtime Config
declare global {
  interface Window {
    env?: {
      API_KEY?: string;
      AZURE_OPENAI_API_KEY?: string;
      AZURE_OPENAI_ENDPOINT?: string;
      AZURE_CLIENT_ID?: string;
      AZURE_TENANT_ID?: string;
      REACT_APP_STORAGE_ENDPOINT?: string;
      AZURE_OPENAI_DEPLOYMENT?: string;
    };
  }
}

// Initial State Factory
export const createInitialSessionData = (): FullSessionExport => ({
  session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
  completion_timestamp: null,
  completeness_percentage: 0,
  data_quality: "initial",
  artifacts: {
    project_charter: {
      status: "not_started",
      fields: {
        problem_statement: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: "" },
        business_objectives: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: "" },
        scope_inclusions: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: "" },
        scope_exclusions: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: [] },
        assumptions: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: [] },
        constraints: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: "" },
        budget_range: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: null },
        key_stakeholders: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: [] },
        success_criteria: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: [] },
        target_timeline: { captured_at: null, confirmed: false, discussion_status: 'never_asked', value: "" },
      }
    },
    requirements: {
      status: "not_started",
      functional: [],
      integration_points: [],
      non_functional: { performance: [], security: [], reliability: [], usability: [], scalability: [] },
      technical_constraints: []
    },
    user_stories: {
      status: "not_started",
      stories: []
    },
    prd_enhancements: {
      status: "not_started",
      business_rules: { discussion_status: 'never_asked', rules: [] },
      data_requirements: { discussion_status: 'never_asked', data_elements: [], integration_needs: [] },
      success_metrics: { discussion_status: 'never_asked', kpis: [], analytics_requirements: [] },
      user_journeys: { discussion_status: 'never_asked', journeys: [] },
      user_personas: { discussion_status: 'never_asked', personas: [] }
    },
    acceptance_criteria: {
      status: "not_started",
      global_criteria: [],
      story_criteria: {}
    }
  },
  summary: {
    completion_percentage: 0,
    last_updated: new Date().toISOString(),
    project_id: crypto.randomUUID(),
    stats: { charter_fields_captured: 0, requirements_count: 0, user_stories_count: 0 }
  },
  next_stage_instructions: { description: "", usage: "", completeness: "" }
});