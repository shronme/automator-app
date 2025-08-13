# @automator/recorder-mac

A macOS Accessibility API recorder for capturing desktop automation workflows. This package provides a Node.js N-API addon that uses macOS Accessibility APIs to record user interactions with native applications.

## Features

- **Native AX Recording**: Captures clicks, typing, and UI element interactions using macOS Accessibility APIs
- **Resilient Selectors**: Generates selectors based on AX role, title, identifier, and ancestry path
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Event-Driven**: Emits events for recorded steps in real-time
- **Flow DSL Conversion**: Converts recorded steps to Flow DSL format

## Prerequisites

- macOS 10.15 or later
- Node.js 18.0.0 or later
- Accessibility permissions granted to your application

## Installation

```bash
# Install dependencies
pnpm install

# Build native addon
pnpm run build
```

## Permissions Setup

Before using the recorder, your application needs Accessibility and Screen Recording permissions:

1. Open System Settings → Privacy & Security → Accessibility
2. Add your Electron app to the list of allowed applications
3. Open System Settings → Privacy & Security → Screen Recording
4. Add your Electron app to the list of allowed applications

## Usage

### Basic Recording

```typescript
import { MacRecorder, RecordedStep } from '@automator/recorder-mac';

const recorder = new MacRecorder();

// Start recording
await recorder.startRecording('session-123');

// Listen for recorded steps
recorder.on('stepRecorded', (step: RecordedStep) => {
  console.log('Step recorded:', step.action, step.targetDescriptor.role);
});

// Stop recording and get all steps
const steps = await recorder.stopRecording();
console.log(`Recorded ${steps.length} steps`);
```

### Convert to Flow DSL

```typescript
// Convert recorded steps to Flow DSL
const flow = recorder.convertToFlow(steps, 'My Recorded Workflow');
console.log(JSON.stringify(flow, null, 2));
```

Example Flow output:

```json
{
  "version": "0.1",
  "name": "My Recorded Workflow",
  "variables": [],
  "steps": [
    {
      "type": "click",
      "selector": "[role=\"AXButton\"][title=\"Send\"]"
    },
    {
      "type": "type",
      "selector": "[role=\"AXTextField\"][id=\"email-input\"]",
      "text": "hello@example.com"
    }
  ]
}
```

## API Reference

### MacRecorder

#### Methods

- `startRecording(sessionId: string): Promise<void>` - Start recording user interactions
- `stopRecording(): Promise<RecordedStep[]>` - Stop recording and return all captured steps
- `isRecording(): boolean` - Check if recording is currently active
- `getCurrentSessionId(): string | null` - Get the current session ID
- `convertToFlow(steps: RecordedStep[], flowName?: string): Flow` - Convert steps to Flow DSL

#### Events

- `stepRecorded` - Emitted when a new step is recorded
- `recordingStarted` - Emitted when recording starts
- `recordingStopped` - Emitted when recording stops
- `error` - Emitted when an error occurs

### Data Types

#### RecordedStep

```typescript
interface RecordedStep {
  timestamp: number; // Unix timestamp in milliseconds
  sessionId: string; // Recording session identifier
  action: 'click' | 'type' | 'drag'; // Type of action
  button?: 'left' | 'right'; // Mouse button (for click/drag)
  text?: string; // Typed text (for type action)
  location: Point; // Screen coordinates
  modifiers: Modifiers; // Keyboard modifiers
  targetDescriptor: TargetDescriptor; // AX element information
  appInfo: ApplicationInfo; // Application information
}
```

#### TargetDescriptor

```typescript
interface TargetDescriptor {
  role: string; // AX role (AXButton, AXTextField, etc.)
  title: string; // AX title attribute
  identifier: string; // AX identifier attribute
  value: string; // AX value attribute
  frame: Frame; // Element bounding rectangle
  ancestry: string[]; // Path from root to element
}
```

## Sample Usage in Electron

```typescript
// In main process
import { MacRecorder } from '@automator/recorder-mac';

let recorder: MacRecorder | null = null;

ipcMain.handle('start-recording', async (event, { sessionId }) => {
  if (!recorder) {
    recorder = new MacRecorder();
  }

  await recorder.startRecording(sessionId);
  return { success: true, sessionId };
});

ipcMain.handle('stop-recording', async () => {
  if (!recorder) {
    throw new Error('No recording session active');
  }

  const steps = await recorder.stopRecording();
  const flow = recorder.convertToFlow(steps, 'Recorded Workflow');

  return {
    success: true,
    stepsRecorded: steps.length,
    flow,
  };
});
```

## Build Configuration

The native addon is built using `node-gyp` with the following frameworks:

- ApplicationServices (for Accessibility APIs)
- Carbon (for process management)
- CoreGraphics (for event monitoring)
- Foundation (for Core Foundation types)

## Security Considerations

- The recorder captures all user interactions when active
- Secure text fields (passwords) are automatically excluded
- All data remains local - no cloud processing
- Screen recording permission is required for visual feedback

## Troubleshooting

### "Failed to create event taps" Error

- Ensure Accessibility permissions are granted
- Run your app with sudo during development if needed
- Check that your app bundle has proper entitlements

### Native Module Load Error

- Run `pnpm run build` to compile the addon
- Ensure you're running on macOS
- Check that all dependencies are installed

## Contributing

1. Ensure you have Xcode command line tools installed
2. Install dependencies with `pnpm install`
3. Build with `pnpm run build`
4. Run tests with `pnpm test`

## License

MIT
