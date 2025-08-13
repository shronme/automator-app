import { EventEmitter } from 'events';
import { createRequire } from 'module';
import {
  RecordedStep,
  RecorderEvents,
  RecorderEventType,
  Flow,
  FlowStep,
  FlowVariable,
} from './types.js';

// Native addon interface
interface NativeAXRecorder {
  startRecording(sessionId: string): boolean;
  stopRecording(): boolean;
  isRecording(): boolean;
  getRecordedSteps(): RecordedStep[];
  clearSteps(): boolean;
}

export class MacRecorder extends EventEmitter {
  private nativeRecorder: NativeAXRecorder;
  private currentSessionId: string | null = null;
  private stepPollingInterval: NodeJS.Timeout | null = null;
  private lastStepCount = 0;

  constructor() {
    super();

    try {
      // Load the native addon using createRequire for ES modules
      const require = createRequire(import.meta.url);
      const addon = require('../build/Release/ax_recorder.node');
      this.nativeRecorder = new addon.AXRecorder();
    } catch (error) {
      throw new Error(
        `Failed to load native AX recorder addon. Make sure it's built and accessibility permissions are granted. Error: ${error}`
      );
    }
  }

  /**
   * Start recording user actions
   * @param sessionId Unique identifier for this recording session
   * @returns Promise that resolves when recording starts
   */
  public async startRecording(sessionId: string): Promise<void> {
    if (this.currentSessionId) {
      throw new Error('Recording is already in progress');
    }

    const success = this.nativeRecorder.startRecording(sessionId);
    if (!success) {
      throw new Error(
        'Failed to start recording. Make sure accessibility permissions are granted.'
      );
    }

    this.currentSessionId = sessionId;
    this.startStepPolling();
    this.emit('recordingStarted', sessionId);
  }

  /**
   * Stop the current recording session
   * @returns Promise that resolves when recording stops
   */
  public async stopRecording(): Promise<RecordedStep[]> {
    if (!this.currentSessionId) {
      throw new Error('No recording session is active');
    }

    this.stopStepPolling();
    this.nativeRecorder.stopRecording();

    // Get ALL recorded steps (not just new ones since polling already consumed them)
    const finalSteps = this.nativeRecorder.getRecordedSteps();

    this.currentSessionId = null;
    this.lastStepCount = 0;
    this.emit('recordingStopped');

    // Clear steps from native recorder
    this.nativeRecorder.clearSteps();

    return finalSteps;
  }

  /**
   * Check if recording is currently active
   */
  public isRecording(): boolean {
    return this.nativeRecorder.isRecording();
  }

  /**
   * Get the current session ID
   */
  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Convert recorded steps to a Flow DSL structure
   * This is a basic conversion - more sophisticated analysis would be needed
   * for production use (detecting loops, variables, etc.)
   */
  public convertToFlow(
    steps: RecordedStep[],
    flowName: string = 'Recorded Flow'
  ): Flow {
    const flowSteps: FlowStep[] = [];
    const variables: FlowVariable[] = [];

    // Group consecutive typing actions
    let currentText = '';
    let lastTarget: string | null = null;

    for (const step of steps) {
      const targetSelector = this.generateSelector(step);

      if (step.action === 'type') {
        if (lastTarget === targetSelector) {
          // Accumulate text for the same target
          currentText += step.text || '';
        } else {
          // Flush previous text input
          if (currentText && lastTarget) {
            flowSteps.push({
              type: 'type',
              selector: lastTarget,
              text: currentText,
            });
          }
          currentText = step.text || '';
          lastTarget = targetSelector;
        }
      } else {
        // Flush any accumulated text first
        if (currentText && lastTarget) {
          flowSteps.push({
            type: 'type',
            selector: lastTarget,
            text: currentText,
          });
          currentText = '';
          lastTarget = null;
        }

        if (step.action === 'click') {
          flowSteps.push({
            type: 'click',
            selector: targetSelector,
          });
        }
      }
    }

    // Flush any remaining text
    if (currentText && lastTarget) {
      flowSteps.push({
        type: 'type',
        selector: lastTarget,
        text: currentText,
      });
    }

    return {
      version: '0.1',
      name: flowName,
      variables,
      steps: flowSteps,
    };
  }

  /**
   * Generate a selector string for a recorded step
   * This creates an AX-based selector using role, title, and identifier
   */
  private generateSelector(step: RecordedStep): string {
    const { targetDescriptor } = step;
    const parts: string[] = [];

    if (targetDescriptor.role) {
      parts.push(`[role="${targetDescriptor.role}"]`);
    }

    if (targetDescriptor.identifier) {
      parts.push(`[id="${targetDescriptor.identifier}"]`);
    } else if (targetDescriptor.title) {
      parts.push(`[title="${targetDescriptor.title}"]`);
    }

    // Fallback to a generic selector with position
    if (parts.length === 0) {
      parts.push(
        `[ax-position="${targetDescriptor.frame.x},${targetDescriptor.frame.y}"]`
      );
    }

    return parts.join('');
  }

  /**
   * Start polling for new recorded steps
   */
  private startStepPolling(): void {
    this.stepPollingInterval = setInterval(() => {
      const newSteps = this.collectNewSteps();
      newSteps.forEach((step) => {
        this.emit('stepRecorded', step);
      });
    }, 100); // Poll every 100ms
  }

  /**
   * Stop polling for new steps
   */
  private stopStepPolling(): void {
    if (this.stepPollingInterval) {
      clearInterval(this.stepPollingInterval);
      this.stepPollingInterval = null;
    }
  }

  /**
   * Collect new steps since last check
   */
  private collectNewSteps(): RecordedStep[] {
    const allSteps = this.nativeRecorder.getRecordedSteps();
    const newSteps = allSteps.slice(this.lastStepCount);
    this.lastStepCount = allSteps.length;
    return newSteps;
  }

  // EventEmitter type safety
  public on<T extends RecorderEventType>(
    event: T,
    listener: RecorderEvents[T]
  ): this {
    return super.on(event, listener);
  }

  public emit<T extends RecorderEventType>(
    event: T,
    ...args: Parameters<RecorderEvents[T]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
