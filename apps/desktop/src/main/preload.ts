import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
  // IPC communication with type safety
  invoke: async (channel: string, data: unknown): Promise<unknown> => {
    return ipcRenderer.invoke(channel, data);
  },

  // Utility functions
  generateId: (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Platform information
  platform: process.platform,
  isDevMode: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api);
  } catch (error) {
    // TODO: Add proper error logging for API exposure failure
  }
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electronAPI = api;
}

export type ElectronAPI = typeof api;
