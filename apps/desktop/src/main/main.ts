import { app, BrowserWindow, ipcMain, shell, desktopCapturer } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  validateIPCMessage,
  StartRecordingRequestSchema,
  StopRecordingRequestSchema,
  RunFlowRequestSchema,
  GetFlowsRequestSchema,
  CreateFlowRequestSchema,
  IPCResponse,
  Flow,
} from '@automator/common';
import { MacRecorder } from '@automator/recorder-mac';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow;
let recorder: MacRecorder | null = null;

// In-memory flow storage (TODO: Replace with proper database)
const flows: Map<string, Flow> = new Map();

// Debug function to log flow storage state
function logFlowStorage(_context: string) {
  // TODO: Replace with proper logging system
  // console.log(`[${_context}] Flow storage state:`, {
  //   size: flows.size,
  //   keys: Array.from(flows.keys()),
  //   flows: Array.from(flows.values()).map(f => ({ id: f.id, name: f.name, steps: f.steps.length }))
  // });
}

// Permission checking functions
async function checkMacOSPermissions(): Promise<{ accessibility: boolean; screenRecording: boolean }> {
  if (process.platform !== 'darwin') {
    return { accessibility: true, screenRecording: true };
  }

  try {
    // Check accessibility permission using AppleScript
    const accessibilityScript = `
      tell application "System Events"
        try
          set frontApp to name of first application process whose frontmost is true
          return "granted"
        on error
          return "denied"
        end try
      end tell
    `;

    const { stdout: accessibilityResult } = await execAsync(`osascript -e '${accessibilityScript}'`);
    const hasAccessibility = accessibilityResult.trim() === 'granted';

    // Check screen recording permission using desktop capturer
    let hasScreenRecording = false;
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      });
      hasScreenRecording = sources.length > 0;
    } catch {
      hasScreenRecording = false;
    }

    return {
      accessibility: hasAccessibility,
      screenRecording: hasScreenRecording,
    };
  } catch {
    // Safe console logging to prevent EPIPE errors
    try {
      // TODO: Replace with proper logging system
      // console.error('Error checking permissions:', error);
    } catch {
      // Ignore logging errors to prevent crashes
    }
    return { accessibility: false, screenRecording: false };
  }
}

async function requestAccessibilityPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true;
  }

  try {
    // Trigger accessibility permission request by attempting to access system events
    const script = `
      tell application "System Events"
        try
          set frontApp to name of first application process whose frontmost is true
          return "granted"
        on error errMsg number errNum
          return "denied: " & errMsg
        end try
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${script}'`);
    return stdout.trim() === 'granted';
  } catch {
    // Safe console logging to prevent EPIPE errors
    try {
      // TODO: Replace with proper logging system
      // console.error('Error requesting accessibility permission:', error);
    } catch {
      // Ignore logging errors to prevent crashes
    }
    return false;
  }
}

async function requestScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true;
  }

  try {
    // Trigger screen recording permission by attempting to capture screen
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 }
    });
    
    return sources.length > 0;
  } catch {
    // Safe console logging to prevent EPIPE errors
    try {
      // TODO: Replace with proper logging system
      // console.error('Error requesting screen recording permission:', error);
    } catch {
      // Ignore logging errors to prevent crashes
    }
    return false;
  }
}

async function openAccessibilitySettings(): Promise<void> {
  if (process.platform !== 'darwin') {
    return;
  }

  try {
    // Use AppleScript to open Privacy & Security preferences to Accessibility
    const script = `
      tell application "System Preferences"
        activate
        reveal anchor "Privacy_Accessibility" of pane id "com.apple.preference.security"
      end tell
    `;
    
    await execAsync(`osascript -e '${script}'`);
  } catch {
    // Fallback to direct URL scheme
    try {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    } catch {
      // Safe console logging to prevent EPIPE errors
      try {
        // TODO: Replace with proper logging system
        // console.error('Failed to open accessibility settings:', error, fallbackError);
      } catch {
        // Ignore logging errors to prevent crashes
      }
    }
  }
}

async function openScreenRecordingSettings(): Promise<void> {
  if (process.platform !== 'darwin') {
    return;
  }

  try {
    // Use AppleScript to open Privacy & Security preferences to Screen Recording
    const script = `
      tell application "System Preferences"
        activate
        reveal anchor "Privacy_ScreenCapture" of pane id "com.apple.preference.security"
      end tell
    `;
    
    await execAsync(`osascript -e '${script}'`);
  } catch {
    // Fallback to direct URL scheme
    try {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    } catch {
      // Safe console logging to prevent EPIPE errors
      try {
        // TODO: Replace with proper logging system
        // console.error('Failed to open screen recording settings:', error, fallbackError);
      } catch {
        // Ignore logging errors to prevent crashes
      }
    }
  }
}

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
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Secure IPC handlers with Zod validation
function setupIPCHandlers(): void {
  // Add a test flow for debugging
  
  // Start recording handler
  ipcMain.handle(
    'start-recording',
    async (event, data): Promise<IPCResponse> => {
      try {
        const request = validateIPCMessage(StartRecordingRequestSchema, data);
        
        if (!recorder) {
          recorder = new MacRecorder();
          // TODO: Replace with proper logging system
          // console.log('Created new MacRecorder instance');
        }
        
        // TODO: Replace with proper logging system
        // console.log('Starting recording with sessionId:', request.sessionId);
        await recorder.startRecording(request.sessionId);
        
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
        
        if (!recorder) {
          throw new Error('No recording session is active');
        }
        
        const recordedSteps = await recorder.stopRecording();
        // TODO: Replace with proper logging system
        // console.log('Native recorder returned steps:', recordedSteps.length);
        // console.log('Steps:', recordedSteps);
        
        const partialFlow = recorder.convertToFlow(recordedSteps, 'Recorded Flow');
        // TODO: Replace with proper logging system
        // console.log('Generated flow:', partialFlow);
        
        // SIMPLIFIED APPROACH: Just save the partial flow with minimal required fields
        const simpleFlow: Flow = {
          id: `flow-${Date.now()}`,
          name: partialFlow.name || 'Recorded Flow',
          version: partialFlow.version || '0.1', 
          variables: [],
          steps: partialFlow.steps || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        // TODO: Replace with proper logging system
        // console.log('Created simple flow for storage');
        flows.set(simpleFlow.id, simpleFlow);
        // TODO: Replace with proper logging system
        // console.log('Saved simple flow, total flows:', flows.size);
        
        return {
          id: request.id,
          timestamp: Date.now(),
          success: true,
          data: { 
            sessionId: request.sessionId, 
            status: 'stopped',
            stepsRecorded: recordedSteps.length,
            flow: simpleFlow
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
    // TODO: Replace with proper logging system
    // console.log('🔥 GET-FLOWS HANDLER CALLED 🔥');
    // console.log('Received data:', data);
    
    try {
      const request = validateIPCMessage(GetFlowsRequestSchema, data);
      // TODO: Replace with proper logging system
      // console.log('✅ Validation passed');
      
      logFlowStorage('Get flows request');
      
      // Return flows from storage
      const flowsArray = Array.from(flows.values());
      // TODO: Replace with proper logging system
      // console.log('📦 Retrieved flows from storage:', flowsArray.length);
      // console.log('📋 Flows data:', flowsArray.map(f => ({ id: f.id, name: f.name, steps: f.steps.length })));
      
      const response = {
        id: request.id,
        timestamp: Date.now(),
        success: true,
        data: { flows: flowsArray },
      };
      
      // TODO: Replace with proper logging system
      // console.log('📤 Sending flows response:', { success: response.success, flowCount: flowsArray.length });
      // console.log('📤 Full response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      // TODO: Replace with proper logging system
      // console.error('❌ Error in get-flows handler:', error);
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
      
      const flow: Flow = {
        ...request.flow,
        id: `flow-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        variables: request.flow.variables.map(v => ({
          ...v,
          required: v.required ?? false
        }))
      };
      
      // Save flow to storage
      flows.set(flow.id, flow);
      // TODO: Replace with proper logging system
      // console.log('Created and saved flow:', flow.name, 'total flows:', flows.size);

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

  // Check permissions handler
  ipcMain.handle('check-permissions', async (event, data): Promise<IPCResponse> => {
    try {
      const permissions = await checkMacOSPermissions();
      
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: true,
        data: permissions,
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

  // Open accessibility settings handler
  ipcMain.handle('open-accessibility-settings', async (event, data): Promise<IPCResponse> => {
    try {
      await openAccessibilitySettings();
      
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: true,
        data: { opened: true },
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

  // Open screen recording settings handler
  ipcMain.handle('open-screen-recording-settings', async (event, data): Promise<IPCResponse> => {
    try {
      await openScreenRecordingSettings();
      
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: true,
        data: { opened: true },
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

  // Request accessibility permission handler
  ipcMain.handle('request-accessibility-permission', async (event, data): Promise<IPCResponse> => {
    try {
      const granted = await requestAccessibilityPermission();
      
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: true,
        data: { granted },
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

  // Request screen recording permission handler
  ipcMain.handle('request-screen-recording-permission', async (event, data): Promise<IPCResponse> => {
    try {
      const granted = await requestScreenRecordingPermission();
      
      return {
        id: data?.id || 'unknown',
        timestamp: Date.now(),
        success: true,
        data: { granted },
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
