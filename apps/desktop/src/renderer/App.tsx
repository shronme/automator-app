import React, { useState, useEffect, useCallback } from 'react';
import { Flow, IPCResponse } from '@automator/common';
import { OnboardingModal } from './components/OnboardingModal';

// Declare the electronAPI type to fix TypeScript error
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, data: unknown) => Promise<IPCResponse>;
      generateId: () => string;
      platform: string;
      isDevMode: boolean;
    };
  }
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [status, setStatus] = useState<string>('Ready');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Check if electronAPI is available
  const electronAPI = window.electronAPI;

  const checkInitialPermissions = useCallback(async () => {
    // TODO: Replace with proper logging system
    // console.log('Checking initial permissions...');
    try {
      const result = await electronAPI.invoke('check-permissions', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'check-permissions',
      });

      // TODO: Replace with proper logging system
      // console.log('Permission check result:', result);
      
      if (result.success && result.data) {
        const { accessibility, screenRecording } = result.data as { accessibility: boolean; screenRecording: boolean };
        // TODO: Replace with proper logging system
        // console.log('Permissions:', { accessibility, screenRecording });
        if (!accessibility || !screenRecording) {
          // TODO: Replace with proper logging system
          // console.log('Missing permissions, showing onboarding modal');
          setShowOnboarding(true);
        } else {
          // TODO: Replace with proper logging system
          // console.log('All permissions granted');
        }
      }
    } catch {
      // TODO: Replace with proper logging system
      // console.error('Failed to check initial permissions:', error);
    }
  }, [electronAPI]);

  const handleGetFlows = useCallback(async () => {
    if (!electronAPI) return;

    try {
      const result = await electronAPI.invoke('get-flows', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'get-flows',
      });

      if (result.success && result.data) {
        const flowsData = result.data as { flows: Flow[] };
        // TODO: Replace with proper logging system
        // console.log('Setting flows:', flowsData.flows);
        // console.log('About to call setFlows with:', flowsData.flows);
        setFlows(flowsData.flows);
        // TODO: Replace with proper logging system
        // console.log('setFlows called, checking state in next render...');
        setStatus(`Found ${flowsData.flows.length} flows`);
      } else {
        // TODO: Replace with proper logging system
        // console.log('=== FLOW CONDITION FAILED ===');
        // console.log('Failed to get flows:', result.error);
        // console.log('Result data type:', typeof result.data);
        // console.log('Result data:', result.data);
        setStatus(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      // TODO: Replace with proper logging system
      // console.error('=== EXCEPTION IN GET FLOWS ===');
      // console.error('Exception getting flows:', error);
      setStatus(`Failed to get flows: ${error}`);
    }
  }, [electronAPI]);

  // Check permissions on app load
  useEffect(() => {
    if (electronAPI && electronAPI.platform === 'darwin') {
      checkInitialPermissions();
    }
  }, [electronAPI, checkInitialPermissions]);

  // Load flows on app start
  useEffect(() => {
    if (electronAPI) {
      handleGetFlows();
    }
  }, [electronAPI, handleGetFlows]);

  // Force refresh flows after recording stops
  useEffect(() => {
    if (!isRecording && currentSessionId) {
      // Recording just stopped, refresh flows
      // TODO: Replace with proper logging system
      // console.log('Recording stopped, refreshing flows...');
      setTimeout(() => {
        handleGetFlows();
      }, 100); // Small delay to ensure main process has finished
    }
  }, [isRecording, currentSessionId, handleGetFlows]);

  // Debug: Log flows before rendering
  useEffect(() => {
    // TODO: Replace with proper logging system
    // console.log('=== FLOWS STATE CHANGED ===');
    // console.log('Flows type:', typeof flows);
    // console.log('Flows is array:', Array.isArray(flows));
    // console.log('Flows length:', flows?.length);
    // console.log('Raw flows data:', flows);
    
    if (Array.isArray(flows)) {
      flows.forEach((_flow, _idx) => {
        // TODO: Replace with proper logging system
        // console.log(`Flow[${_idx}]:`, _flow);
        // console.log(`Flow[${_idx}] id:`, _flow.id);
        // console.log(`Flow[${_idx}] name:`, _flow.name);
        // console.log(`Flow[${_idx}] steps count:`, _flow.steps?.length);
      });
    } else {
      // TODO: Replace with proper logging system
      // console.log('Flows is not an array:', flows);
    }
  }, [flows]);

  if (!electronAPI) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>AI Desktop Automation</h1>
          <p className="status">Loading...</p>
        </header>
        <main className="main-content">
          <section className="welcome">
            <h2>⚠️ Electron API Not Available</h2>
            <p>
              The preload script hasn&apos;t loaded yet. Please wait or refresh.
            </p>
          </section>
        </main>
      </div>
 );
  }

  const handleStartRecording = async () => {
    try {
      const sessionId = electronAPI.generateId();
      const result = await electronAPI.invoke('start-recording', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'start-recording',
        sessionId,
      });

      if (result.success) {
        setIsRecording(true);
        setCurrentSessionId(sessionId);
        setStatus('Recording...');
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Failed to start recording: ${error}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await electronAPI.invoke('stop-recording', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'stop-recording',
        sessionId: currentSessionId || 'unknown',
      });

      // TODO: Replace with proper logging system
      // console.log('Stop recording result:', result);
      // console.log('Result success:', result.success);
      // console.log('Result data exists:', !!result.data);
      // console.log('Full result data:', result.data);

      if (result.success) {
        setIsRecording(false);
        setCurrentSessionId(null);
        if (result.data) {
          const data = result.data as { stepsRecorded: number; flow: Flow };
          // TODO: Replace with proper logging system
          // console.log('Recorded steps:', data.stepsRecorded);
          // console.log('Generated flow is:', data.flow);
          // console.log('Data:', data);
          setStatus(`Recording stopped - ${data.stepsRecorded} steps recorded`);
          // Automatically refresh flows to show the newly created flow
          // TODO: Replace with proper logging system
          // console.log('About to automatically refresh flows after recording...');
          handleGetFlows();
        } else {
          // TODO: Replace with proper logging system
          // console.log('No result.data, not triggering auto-refresh');
          setStatus('Recording stopped');
        }
      } else {
        // TODO: Replace with proper logging system
        // console.log('Result not successful:', result.error);
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Failed to stop recording: ${error}`);
    }
  };


  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Desktop Automation</h1>
        <p className="status">Status: {status}</p>
      </header>

      <main className="main-content">
        <section className="welcome">
          <h2>🎉 Welcome to AI Desktop Automation</h2>
          <p>
            This application lets you record desktop workflows and replay them
            automatically.
          </p>
          <p>✅ Electron + React app is running successfully!</p>
          <p>✅ Secure IPC communication is enabled</p>
          <p>✅ TypeScript and Zod validation are active</p>
        </section>

        <section className="controls">
          <h2>Recording</h2>
          <div className="button-group">
            <button
              onClick={handleStartRecording}
              disabled={isRecording}
              className="btn btn-primary"
            >
              Start Recording
            </button>
            <button
              onClick={handleStopRecording}
              disabled={!isRecording}
              className="btn btn-secondary"
            >
              Stop Recording
            </button>
          </div>
        </section>

        <section className="flows">
          <h2>Flows</h2>
          <div className="button-group">
            <button onClick={handleGetFlows} className="btn btn-outline">
              Refresh Flows
            </button>
          </div>

          <div className="flow-list">
            {!flows || flows.length === 0 ? (
              <div className="empty-state">
                <p>No flows found</p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Try recording a workflow to see flows here.
                </p>
              </div>
            ) : (
              flows.map((flow, idx) => (
                <div key={flow.id || `flow-${idx}`} className="flow-item" style={{ 
                  border: '1px solid #ddd', 
                  padding: '15px', 
                  margin: '10px 0', 
                  borderRadius: '4px',
                  background: '#fafafa'
                }}>
                  <h3>{flow.name || 'Unnamed Flow'}</h3>
                  <p><strong>Version:</strong> {flow.version || '0.1'}</p>
                  <p><strong>Steps:</strong> {flow.steps?.length || 0}</p>
                  <p><strong>Variables:</strong> {flow.variables?.length || 0}</p>
                  <p style={{ fontSize: '11px', color: '#888' }}>
                    <strong>Flow ID:</strong> {flow.id || 'undefined'}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888' }}>
                    <strong>Created:</strong> {flow.createdAt ? new Date(flow.createdAt).toLocaleString() : 'unknown'}
                  </p>
                  
                  {/* Show steps */}
                  <div style={{ marginTop: '10px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Steps:</h4>
                    {flow.steps && flow.steps.length > 0 ? (
                      <div style={{ maxHeight: '200px', overflow: 'auto', background: '#fff', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                        {flow.steps.map((step, stepIdx) => (
                          <div key={stepIdx} style={{ 
                            marginBottom: '8px', 
                            padding: '6px', 
                            background: '#f9f9f9', 
                            borderRadius: '3px',
                            fontSize: '12px'
                          }}>
                            <div><strong>Type:</strong> {step.type}</div>
                            {step.selector && <div><strong>Selector:</strong> {step.selector}</div>}
                            {step.text && <div><strong>Text:</strong> {step.text}</div>}
                            {step.url && <div><strong>URL:</strong> {step.url}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No steps recorded</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>Platform: {electronAPI.platform}</p>
        <p>Dev Mode: {electronAPI.isDevMode ? 'Yes' : 'No'}</p>
      </footer>

      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  );
}

export default App;
