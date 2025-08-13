/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, data: unknown) => Promise<unknown>;
      generateId: () => string;
      platform: string;
      isDevMode: boolean;
    };
  }
}
