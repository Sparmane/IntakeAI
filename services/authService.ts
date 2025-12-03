
import { AI_CONFIG } from '../config';
import { AuthUser } from '../types';

/**
 * Auth Service
 * 
 * Handles interaction with Azure Entra ID (via MSAL) or Mock Authentication
 * based on the configuration in config.ts.
 */

// Mock User for Development Mode
const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  name: 'Dev Analyst',
  email: 'developer@intakeai.local',
  isAuthenticated: true,
  avatar: 'DA'
};

export const authService = {
  
  /**
   * Checks if the user is currently authenticated.
   * If SSO is disabled, returns true immediately with a mock user.
   */
  checkAuth: async (): Promise<AuthUser | null> => {
    // 1. BYPASS MODE: If auth is disabled in config, return Mock User
    if (!AI_CONFIG.auth.enabled) {
      console.log("[Auth] SSO Disabled. Using Development User.");
      // Simulate a tiny delay to mimic async check
      await new Promise(r => setTimeout(r, 300));
      return DEV_USER;
    }

    // 2. REAL MODE: Check MSAL instance (Placeholder for implementation)
    // In a full implementation, you would check PublicClientApplication.getAllAccounts()
    // For now, we return null to force the Login Screen
    console.log("[Auth] SSO Enabled. Checking session...");
    const savedUser = sessionStorage.getItem('intake_ai_user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }

    return null;
  },

  /**
   * Initiates the login process.
   * If SSO is disabled, just returns the mock user.
   */
  login: async (): Promise<AuthUser> => {
    if (!AI_CONFIG.auth.enabled) {
      return DEV_USER;
    }

    // --- MSAL LOGIN LOGIC WOULD GO HERE ---
    /*
    try {
      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      const response = await msalInstance.loginPopup(loginRequest);
      // Map response to AuthUser...
    } catch (e) { ... }
    */

    // For now, since we don't have the full MSAL Context wrapped in this file,
    // we simulate a login for demonstration if enabled but not wired up.
    // In production, this throws or redirects.
    
    // Simulate successful Entra ID login
    const entraUser: AuthUser = {
      id: crypto.randomUUID(),
      name: 'Entra User',
      email: 'user@corporate.com',
      isAuthenticated: true,
      avatar: 'EU'
    };
    
    sessionStorage.setItem('intake_ai_user', JSON.stringify(entraUser));
    return entraUser;
  },

  /**
   * Logs the user out.
   */
  logout: async () => {
    sessionStorage.removeItem('intake_ai_user');
    // In real MSAL, call instance.logoutRedirect();
    window.location.reload();
  }
};
