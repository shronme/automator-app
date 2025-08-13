'use strict';
// Jest setup file for macOS recorder tests
// Mock the native addon for tests
jest.mock('../recorder', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const EventEmitter = require('events');
  return {
    MacRecorder: class MockMacRecorder extends EventEmitter {
      recording = false;
      sessionId = null;
      steps = [];
      async startRecording(sessionId) {
        if (this.recording) {
          throw new Error('Recording is already in progress');
        }
        this.recording = true;
        this.sessionId = sessionId;
        this.emit('recordingStarted', sessionId);
      }
      async stopRecording() {
        if (!this.recording) {
          throw new Error('No recording session is active');
        }
        this.recording = false;
        const steps = [...this.steps];
        this.steps = [];
        this.sessionId = null;
        this.emit('recordingStopped');
        return steps;
      }
      isRecording() {
        return this.recording;
      }
      getCurrentSessionId() {
        return this.sessionId;
      }
      convertToFlow(steps, flowName = 'Recorded Flow') {
        return {
          version: '0.1',
          name: flowName,
          variables: [],
          steps: steps.map((step) => ({
            type: step.action === 'click' ? 'click' : 'type',
            selector: `[role="${step.targetDescriptor?.role || 'unknown'}"]`,
            text: step.text,
          })),
        };
      }
      // Helper method for tests to simulate recorded steps
      _simulateStep(step) {
        this.steps.push(step);
        this.emit('stepRecorded', step);
      }
    },
  };
});
// Global test timeout
jest.setTimeout(10000);
//# sourceMappingURL=setup.js.map
