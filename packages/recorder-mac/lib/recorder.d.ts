import { EventEmitter } from 'events';
import {
  RecordedStep,
  RecorderEvents,
  RecorderEventType,
  Flow,
} from './types.js';
export declare class MacRecorder extends EventEmitter {
  private nativeRecorder;
  private currentSessionId;
  private stepPollingInterval;
  private lastStepCount;
  constructor();
  /**
   * Start recording user actions
   * @param sessionId Unique identifier for this recording session
   * @returns Promise that resolves when recording starts
   */
  startRecording(sessionId: string): Promise<void>;
  /**
   * Stop the current recording session
   * @returns Promise that resolves when recording stops
   */
  stopRecording(): Promise<RecordedStep[]>;
  /**
   * Check if recording is currently active
   */
  isRecording(): boolean;
  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null;
  /**
   * Convert recorded steps to a Flow DSL structure
   * This is a basic conversion - more sophisticated analysis would be needed
   * for production use (detecting loops, variables, etc.)
   */
  convertToFlow(steps: RecordedStep[], flowName?: string): Flow;
  /**
   * Generate a selector string for a recorded step
   * This creates an AX-based selector using role, title, and identifier
   */
  private generateSelector;
  /**
   * Start polling for new recorded steps
   */
  private startStepPolling;
  /**
   * Stop polling for new steps
   */
  private stopStepPolling;
  /**
   * Collect new steps since last check
   */
  private collectNewSteps;
  on<T extends RecorderEventType>(event: T, listener: RecorderEvents[T]): this;
  emit<T extends RecorderEventType>(
    event: T,
    ...args: Parameters<RecorderEvents[T]>
  ): boolean;
}
//# sourceMappingURL=recorder.d.ts.map
