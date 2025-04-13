/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Chrome extension API types
interface Chrome {
  tabs: {
    query: (queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: ChromeTab[]) => void) => void;
  };
  scripting: {
    executeScript: (params: {
      target: { tabId: number };
      func: () => any;
    }, callback: (results: { result: any }[]) => void) => void;
  };
  runtime: {
    lastError?: { message: string };
    sendMessage: (message: any, callback: (response: any) => void) => void;
  };
}

interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
}

declare const chrome: Chrome; 