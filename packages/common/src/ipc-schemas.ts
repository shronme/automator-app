import { z } from 'zod';

// Base IPC message schema
export const BaseIPCMessageSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
});

// Flow-related schemas
export const FlowVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'number', 'boolean', 'file', 'table', 'secret']),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
});

export const FlowStepSchema = z.object({
  type: z.enum([
    'click',
    'type',
    'select',
    'navigate',
    'wait_for',
    'open_app',
    'guard',
  ]),
  selector: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
  app: z.string().optional(),
  condition: z.string().optional(),
  timeout: z.number().optional(),
});

export const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  variables: z.array(FlowVariableSchema),
  steps: z.array(FlowStepSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Recording schemas
export const RecordedStepSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: z.enum(['click', 'type', 'select', 'navigate', 'wait']),
  target: z.object({
    selector: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
    app: z.string().optional(),
    role: z.string().optional(),
    name: z.string().optional(),
  }),
  screenshotPath: z.string().optional(),
});

// IPC Channel schemas
export const StartRecordingRequestSchema = BaseIPCMessageSchema.extend({
  channel: z.literal('start-recording'),
  sessionId: z.string(),
});

export const StopRecordingRequestSchema = BaseIPCMessageSchema.extend({
  channel: z.literal('stop-recording'),
  sessionId: z.string(),
});

export const RunFlowRequestSchema = BaseIPCMessageSchema.extend({
  channel: z.literal('run-flow'),
  flowId: z.string(),
  variables: z.record(z.unknown()),
  dryRun: z.boolean().default(false),
});

export const GetFlowsRequestSchema = BaseIPCMessageSchema.extend({
  channel: z.literal('get-flows'),
});

export const CreateFlowRequestSchema = BaseIPCMessageSchema.extend({
  channel: z.literal('create-flow'),
  flow: FlowSchema.omit({ id: true, createdAt: true, updatedAt: true }),
});

// Response schemas
export const IPCResponseSchema = BaseIPCMessageSchema.extend({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export const FlowRunResultSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  steps: z.array(
    z.object({
      stepIndex: z.number(),
      status: z.enum(['pending', 'running', 'completed', 'failed']),
      attempts: z.number(),
      screenshotPath: z.string().optional(),
      error: z.string().optional(),
    })
  ),
});

// Type exports
export type BaseIPCMessage = z.infer<typeof BaseIPCMessageSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type FlowVariable = z.infer<typeof FlowVariableSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type RecordedStep = z.infer<typeof RecordedStepSchema>;
export type StartRecordingRequest = z.infer<typeof StartRecordingRequestSchema>;
export type StopRecordingRequest = z.infer<typeof StopRecordingRequestSchema>;
export type RunFlowRequest = z.infer<typeof RunFlowRequestSchema>;
export type GetFlowsRequest = z.infer<typeof GetFlowsRequestSchema>;
export type CreateFlowRequest = z.infer<typeof CreateFlowRequestSchema>;
export type IPCResponse = z.infer<typeof IPCResponseSchema>;
export type FlowRunResult = z.infer<typeof FlowRunResultSchema>;

// IPC Channel types
export type IPCChannels =
  | 'start-recording'
  | 'stop-recording'
  | 'run-flow'
  | 'get-flows'
  | 'create-flow';

// Helper function to validate IPC messages
export function validateIPCMessage<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data);
}
