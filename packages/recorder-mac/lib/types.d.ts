export interface Point {
  x: number;
  y: number;
}
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Modifiers {
  shift: boolean;
  control: boolean;
  option: boolean;
  command: boolean;
}
export interface ApplicationInfo {
  name: string;
  processId: number;
}
export interface TargetDescriptor {
  role: string;
  title: string;
  identifier: string;
  value: string;
  frame: Frame;
  ancestry: string[];
}
export interface RecordedStep {
  timestamp: number;
  sessionId: string;
  action: 'click' | 'type' | 'drag';
  button?: 'left' | 'right';
  text?: string;
  location: Point;
  modifiers: Modifiers;
  targetDescriptor: TargetDescriptor;
  appInfo: ApplicationInfo;
}
export interface FlowStep {
  type: 'click' | 'type' | 'navigate' | 'wait_for' | 'open_app' | 'guard';
  selector?: string;
  text?: string;
  url?: string;
  app?: string;
  condition?: string;
  timeout?: number;
}
export interface FlowVariable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'file' | 'table' | 'secret';
  required?: boolean;
  default?: unknown;
  source?: 'prompt' | 'file' | 'sheets';
}
export interface Flow {
  version: string;
  name: string;
  variables: FlowVariable[];
  steps: FlowStep[];
}
export interface RecorderEvents {
  stepRecorded: (step: RecordedStep) => void;
  recordingStarted: (sessionId: string) => void;
  recordingStopped: () => void;
  error: (error: Error) => void;
}
export type RecorderEventType = keyof RecorderEvents;
//# sourceMappingURL=types.d.ts.map
