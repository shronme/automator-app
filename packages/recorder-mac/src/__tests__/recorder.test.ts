import { MacRecorder } from '../recorder.js';
import { RecordedStep } from '../types.js';

describe('MacRecorder', () => {
  let recorder: MacRecorder;

  beforeEach(() => {
    recorder = new MacRecorder();
  });

  afterEach(async () => {
    if (recorder.isRecording()) {
      await recorder.stopRecording();
    }
  });

  describe('Recording lifecycle', () => {
    test('should start recording with session ID', async () => {
      const sessionId = 'test-session-1';
      const startedHandler = jest.fn();

      recorder.on('recordingStarted', startedHandler);

      await recorder.startRecording(sessionId);

      expect(recorder.isRecording()).toBe(true);
      expect(recorder.getCurrentSessionId()).toBe(sessionId);
      expect(startedHandler).toHaveBeenCalledWith(sessionId);
    });

    test('should not allow multiple concurrent recordings', async () => {
      await recorder.startRecording('session-1');

      await expect(recorder.startRecording('session-2')).rejects.toThrow(
        'Recording is already in progress'
      );
    });

    test('should stop recording and return steps', async () => {
      const stoppedHandler = jest.fn();
      recorder.on('recordingStopped', stoppedHandler);

      await recorder.startRecording('test-session');

      // Simulate some steps
      const mockStep: RecordedStep = {
        timestamp: Date.now(),
        sessionId: 'test-session',
        action: 'click',
        location: { x: 100, y: 200 },
        modifiers: {
          shift: false,
          control: false,
          option: false,
          command: false,
        },
        targetDescriptor: {
          role: 'AXButton',
          title: 'Send',
          identifier: '',
          value: '',
          frame: { x: 100, y: 200, width: 80, height: 30 },
          ancestry: ['AXApplication', 'AXWindow', 'AXButton'],
        },
        appInfo: { name: 'TestApp', processId: 1234 },
      };

      (recorder as any)._simulateStep(mockStep);

      const steps = await recorder.stopRecording();

      expect(recorder.isRecording()).toBe(false);
      expect(recorder.getCurrentSessionId()).toBe(null);
      expect(steps).toHaveLength(1);
      expect(steps[0]).toEqual(mockStep);
      expect(stoppedHandler).toHaveBeenCalled();
    });

    test('should throw error when stopping without active session', async () => {
      await expect(recorder.stopRecording()).rejects.toThrow(
        'No recording session is active'
      );
    });
  });

  describe('Step recording', () => {
    test('should emit stepRecorded events', async () => {
      const stepHandler = jest.fn();
      recorder.on('stepRecorded', stepHandler);

      await recorder.startRecording('test-session');

      const mockStep: RecordedStep = {
        timestamp: Date.now(),
        sessionId: 'test-session',
        action: 'type',
        text: 'Hello World',
        location: { x: 150, y: 250 },
        modifiers: {
          shift: false,
          control: false,
          option: false,
          command: false,
        },
        targetDescriptor: {
          role: 'AXTextField',
          title: 'Email',
          identifier: 'email-input',
          value: '',
          frame: { x: 150, y: 250, width: 200, height: 25 },
          ancestry: ['AXApplication', 'AXWindow', 'AXTextField'],
        },
        appInfo: { name: 'Mail', processId: 5678 },
      };

      (recorder as any)._simulateStep(mockStep);

      expect(stepHandler).toHaveBeenCalledWith(mockStep);
    });
  });

  describe('Flow conversion', () => {
    test('should convert steps to Flow DSL', () => {
      const steps: RecordedStep[] = [
        {
          timestamp: Date.now(),
          sessionId: 'test',
          action: 'click',
          location: { x: 100, y: 100 },
          modifiers: {
            shift: false,
            control: false,
            option: false,
            command: false,
          },
          targetDescriptor: {
            role: 'AXButton',
            title: 'Compose',
            identifier: 'compose-btn',
            value: '',
            frame: { x: 100, y: 100, width: 80, height: 30 },
            ancestry: [],
          },
          appInfo: { name: 'Mail', processId: 1234 },
        },
        {
          timestamp: Date.now() + 1000,
          sessionId: 'test',
          action: 'type',
          text: 'test@example.com',
          location: { x: 200, y: 150 },
          modifiers: {
            shift: false,
            control: false,
            option: false,
            command: false,
          },
          targetDescriptor: {
            role: 'AXTextField',
            title: 'To',
            identifier: 'to-field',
            value: '',
            frame: { x: 200, y: 150, width: 300, height: 25 },
            ancestry: [],
          },
          appInfo: { name: 'Mail', processId: 1234 },
        },
      ];

      const flow = recorder.convertToFlow(steps, 'Test Flow');

      expect(flow).toEqual({
        version: '0.1',
        name: 'Test Flow',
        variables: [],
        steps: [
          {
            type: 'click',
            selector: '[role="AXButton"][id="compose-btn"]',
          },
          {
            type: 'type',
            selector: '[role="AXTextField"][id="to-field"]',
            text: 'test@example.com',
          },
        ],
      });
    });

    test('should group consecutive typing actions', () => {
      const steps: RecordedStep[] = [
        {
          timestamp: Date.now(),
          sessionId: 'test',
          action: 'type',
          text: 'Hello',
          location: { x: 200, y: 150 },
          modifiers: {
            shift: false,
            control: false,
            option: false,
            command: false,
          },
          targetDescriptor: {
            role: 'AXTextField',
            title: 'Message',
            identifier: 'message-field',
            value: '',
            frame: { x: 200, y: 150, width: 400, height: 100 },
            ancestry: [],
          },
          appInfo: { name: 'Mail', processId: 1234 },
        },
        {
          timestamp: Date.now() + 100,
          sessionId: 'test',
          action: 'type',
          text: ' World',
          location: { x: 200, y: 150 },
          modifiers: {
            shift: false,
            control: false,
            option: false,
            command: false,
          },
          targetDescriptor: {
            role: 'AXTextField',
            title: 'Message',
            identifier: 'message-field',
            value: '',
            frame: { x: 200, y: 150, width: 400, height: 100 },
            ancestry: [],
          },
          appInfo: { name: 'Mail', processId: 1234 },
        },
      ];

      const flow = recorder.convertToFlow(steps, 'Typing Test');

      expect(flow.steps).toHaveLength(1);
      expect(flow.steps[0]).toEqual({
        type: 'type',
        selector: '[role="AXTextField"][id="message-field"]',
        text: 'Hello World',
      });
    });

    test('should handle steps with no identifier or title', () => {
      const steps: RecordedStep[] = [
        {
          timestamp: Date.now(),
          sessionId: 'test',
          action: 'click',
          location: { x: 300, y: 400 },
          modifiers: {
            shift: false,
            control: false,
            option: false,
            command: false,
          },
          targetDescriptor: {
            role: 'AXButton',
            title: '',
            identifier: '',
            value: '',
            frame: { x: 300, y: 400, width: 50, height: 20 },
            ancestry: [],
          },
          appInfo: { name: 'TestApp', processId: 1234 },
        },
      ];

      const flow = recorder.convertToFlow(steps, 'Fallback Test');

      expect(flow.steps[0].selector).toBe('[ax-position="300,400"]');
    });
  });
});
