import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  validateIPCMessage,
  StartRecordingRequestSchema,
  StopRecordingRequestSchema,
  RunFlowRequestSchema,
  GetFlowsRequestSchema,
  CreateFlowRequestSchema,
  IPCResponse,
} from '@automator/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow;

function createWindow(): void {
  // Create the browser window with security best practices
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for preload script
    },
  });

  // Load the app
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Secure IPC handlers with Zod validation
function setupIPCHandlers(): void {
  // Start recording handler
  ipcMain.handle(
    'start-recording',
    async (event, data): Promise<IPCResponse> => {
      try {
        const request = validateIPCMessage(StartRecordingRequestSchema, data);
        // TODO: Add proper logging for recording start

        // TODO: Implement actual recording logic
        return {
          id: request.id,
          timestamp: Date.now(),
          success: true,
          data: { sessionId: request.sessionId, status: 'recording' },
        };
      } catch (error) {
        return {
          id: data?.id || 'unknown',
          timestamp: Date.now(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Stop recording handler
  ipcMain.handle(
    'stop-recording',
    async (event, data): Promise<IPCResponse> => {
      try {
        const request = validateIPCMessage(StopRecordingRequestSchema, data);
        // TODO: Add proper logging for recording stop

        // TODO: Implement actual recording stop logic
        return {
          id: request.id,
          timestamp: Date.now(),
          success: true,
          data: { sessionId: request.sessionId, status: 'stopped' },
        };
      } catch (error) {
        return {
          id: data?.id || 'unknown',
          timestamp: Date.now(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  // Run flow handler
  ipcMain.handle('run-flow', async (event, data): Promise<IPCResponse> => {
    try {
      const request = validateIPCMessage(RunFlowRequestSchema, data);
      // TODO: Add proper logging for flow execution

      // TODO: Implement actual flow execution logic
      return {
        id: request.id,
        timestamp: Date.now(),
        success: true,
        data: {
          runId: `run-${Date.now()}`,
          status: 'running',
          flowId: request.flowId,
        },
      };
    } catch (error) {
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get flows handler
  ipcMain.handle('get-flows', async (event, data): Promise<IPCResponse> => {
    try {
      const request = validateIPCMessage(GetFlowsRequestSchema, data);
      // TODO: Add proper logging for flow retrieval

      // TODO: Implement actual flow retrieval logic
      return {
        id: request.id,
        timestamp: Date.now(),
        success: true,
        data: { flows: [] }, // Empty array for now
      };
    } catch (error) {
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Create flow handler
  ipcMain.handle('create-flow', async (event, data): Promise<IPCResponse> => {
    try {
      const request = validateIPCMessage(CreateFlowRequestSchema, data);
      // TODO: Add proper logging for flow creation

      // TODO: Implement actual flow creation logic
      const flow = {
        ...request.flow,
        id: `flow-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return {
        id: request.id,
        timestamp: Date.now(),
        success: true,
        data: { flow },
      };
    } catch (error) {
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

// App event listeners
app.whenReady().then(() => {
  setupIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    // TODO: Add proper logging for blocked window creation
    return { action: 'deny' };
  });
});

// Handle certificate errors
app.on(
  'certificate-error',
  (event, webContents, url, error, certificate, callback) => {
    // Allow localhost in development
    if (
      process.env.NODE_ENV === 'development' &&
      url.startsWith('http://localhost')
    ) {
      event.preventDefault();
      callback(true);
      return;
    }

    // In production, use default behavior (reject invalid certificates)
    callback(false);
  }
);
