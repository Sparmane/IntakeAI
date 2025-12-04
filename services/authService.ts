
import { PublicClientApplication, Configuration, AccountInfo } from "@azure/msal-browser";
import { AI_CONFIG } from '../config';
import { AuthUser } from '../types';

/**
 * Auth Service
 * 
 * Handles interaction with Azure Entra ID (via MSAL) or Mock Authentication.
 */

// Mock User for Development Mode
const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  name: 'Dev Analyst',
  email: 'developer@intakeai.local',
  isAuthenticated: true,
  avatar: 'DA'
};

// MSAL Configuration
const msalConfig: Configuration = {
  auth: {
    clientId: AI_CONFIG.auth.clientId,
    authority: AI_CONFIG.auth.authority,
    redirectUri: AI_CONFIG.auth.redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set to true if having issues on IE11 or Edge
  },
};

// Singleton instance
let msalInstance: PublicClientApplication | null = null;

/**
 * Initializes the MSAL instance if not already initialized.
 */
const getMsalInstance = async (): Promise<PublicClientApplication> => {
  if (msalInstance) return msalInstance;

  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  return msalInstance;
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
      await new Promise(r => setTimeout(r, 300));
      return DEV_USER;
    }

    try {
      const msal = await getMsalInstance();
      
      // Handle any redirects that might have just happened (if using loginRedirect)
      // This is safe to call even if no redirect happened.
      await msal.handleRedirectPromise();

      // Check for active accounts
      const accounts = msal.getAllAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0];
        msal.setActiveAccount(account);
        return mapAccountToUser(account);
      }
    } catch (e) {
      console.error("[Auth] Session check failed:", e);
    }

    return null;
  },

  /**
   * Initiates the login process using MSAL Popup.
   */
  login: async (): Promise<AuthUser> => {
    if (!AI_CONFIG.auth.enabled) {
      return DEV_USER;
    }

    const msal = await getMsalInstance();

    try {
      const loginResponse = await msal.loginPopup({
        scopes: ["User.Read", "OpenId", "Profile"]
      });

      const user = mapAccountToUser(loginResponse.account);
      console.log("[Auth] Login Successful:", user.name);
      return user;
    } catch (e) {
      console.error("[Auth] Login Failed:", e);
      throw e;
    }
  },

  /**
   * Logs the user out.
   */
  logout: async () => {
    if (!AI_CONFIG.auth.enabled) {
      // Just reload for dev mode
      window.location.reload();
      return;
    }

    const msal = await getMsalInstance();
    
    // Choose logoutPopup or logoutRedirect based on preference
    // logoutRedirect is often cleaner for full sign-out
    await msal.logoutRedirect({
      onRedirectNavigate: () => {
        // Return false if you would like to stop navigation after local logout
        return true;
      }
    });
  }
};

/**
 * Helper to map MSAL AccountInfo to our internal AuthUser type
 */
function mapAccountToUser(account: AccountInfo): AuthUser {
  return {
    id: account.homeAccountId,
    name: account.name || 'Corporate User',
    email: account.username,
    isAuthenticated: true,
    // Use initials if no specific avatar URL is available in the basic token claims
    avatar: (account.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  };
}
