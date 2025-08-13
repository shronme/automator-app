import { contextBridge, ipcRenderer } from 'electron';

// TODO: Replace with proper logging system
// console.log('Preload script starting...');
// console.log('process.contextIsolated:', process.contextIsolated);
// console.log('process.type:', process.type);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
  // IPC communication with type safety
  invoke: async (channel: string, data: unknown): Promise<unknown> => {
    // TODO: Replace with proper logging system
    // console.log('Preload: invoke called with channel:', channel, 'data:', data);
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

// TODO: Replace with proper logging system
// console.log('Preload: API object created:', api);

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // TODO: Replace with proper logging system
    // console.log('Preload: Using contextBridge to expose API');
    contextBridge.exposeInMainWorld('electronAPI', api);
    // TODO: Replace with proper logging system
    // console.log('Preload: API exposed via contextBridge');
  } catch {
    // TODO: Replace with proper logging system
    // console.error('Preload: Error exposing API via contextBridge:', error);
  }
} else {
  // TODO: Replace with proper logging system
  // console.log('Preload: Context isolation disabled, setting window.electronAPI directly');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electronAPI = api;
  // TODO: Replace with proper logging system
  // console.log('Preload: API set directly on window');
}

// TODO: Replace with proper logging system
// console.log('Preload script finished');

// ElectronAPI type is defined in renderer/vite-env.d.ts
