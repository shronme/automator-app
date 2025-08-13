// Jest setup file for macOS recorder tests

import { EventEmitter } from 'events';

// Mock the native addon for tests
jest.mock('../recorder', () => {
  return {
    MacRecorder: class MockMacRecorder extends EventEmitter {
      private recording = false;
      private sessionId: string | null = null;
      private steps: any[] = [];

      async startRecording(sessionId: string): Promise<void> {
        if (this.recording) {
          throw new Error('Recording is already in progress');
        }
        this.recording = true;
        this.sessionId = sessionId;
        this.emit('recordingStarted', sessionId);
      }

      async stopRecording(): Promise<any[]> {
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

      isRecording(): boolean {
        return this.recording;
      }

      getCurrentSessionId(): string | null {
        return this.sessionId;
      }

      convertToFlow(steps: any[], flowName: string = 'Recorded Flow'): any {
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
      _simulateStep(step: any): void {
        this.steps.push(step);
        this.emit('stepRecorded', step);
      }
    },
  };
});

// Global test timeout
jest.setTimeout(10000);
