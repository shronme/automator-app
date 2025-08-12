import React, { useState } from 'react';
import { Flow } from '@automator/common';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [status, setStatus] = useState<string>('Ready');

  // Check if electronAPI is available
  const electronAPI = window.electronAPI;
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
        sessionId: 'current-session',
      });

      if (result.success) {
        setIsRecording(false);
        setStatus('Recording stopped');
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Failed to stop recording: ${error}`);
    }
  };

  const handleGetFlows = async () => {
    try {
      const result = await electronAPI.invoke('get-flows', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'get-flows',
      });

      if (
        result.success &&
        result.data &&
        typeof result.data === 'object' &&
        result.data !== null &&
        'flows' in result.data
      ) {
        setFlows(result.data.flows as Flow[]);
        setStatus(`Found ${(result.data.flows as Flow[]).length} flows`);
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Failed to get flows: ${error}`);
    }
  };

  const handleCreateFlow = async () => {
    try {
      const result = await electronAPI.invoke('create-flow', {
        id: electronAPI.generateId(),
        timestamp: Date.now(),
        channel: 'create-flow',
        flow: {
          name: 'Test Flow',
          version: '0.1',
          variables: [],
          steps: [
            {
              type: 'navigate',
              url: 'https://example.com',
            },
          ],
        },
      });

      if (result.success) {
        setStatus('Flow created successfully');
        handleGetFlows(); // Refresh flow list
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Failed to create flow: ${error}`);
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
            <button onClick={handleCreateFlow} className="btn btn-outline">
              Create Test Flow
            </button>
          </div>

          <div className="flow-list">
            {flows.length === 0 ? (
              <p className="empty-state">No flows found</p>
            ) : (
              flows.map((flow) => (
                <div key={flow.id} className="flow-item">
                  <h3>{flow.name}</h3>
                  <p>Version: {flow.version}</p>
                  <p>Steps: {flow.steps.length}</p>
                  <p>Variables: {flow.variables.length}</p>
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
    </div>
  );
}

export default App;
