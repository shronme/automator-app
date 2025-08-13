import {
  Point,
  Frame,
  Modifiers,
  ApplicationInfo,
  TargetDescriptor,
  RecordedStep,
  FlowStep,
  FlowVariable,
  Flow,
} from '../types.js';

describe('Type definitions', () => {
  test('Point interface should have x and y coordinates', () => {
    const point: Point = { x: 100, y: 200 };

    expect(typeof point.x).toBe('number');
    expect(typeof point.y).toBe('number');
  });

  test('Frame interface should define rectangle bounds', () => {
    const frame: Frame = { x: 10, y: 20, width: 300, height: 400 };

    expect(typeof frame.x).toBe('number');
    expect(typeof frame.y).toBe('number');
    expect(typeof frame.width).toBe('number');
    expect(typeof frame.height).toBe('number');
  });

  test('Modifiers interface should have boolean flags', () => {
    const modifiers: Modifiers = {
      shift: true,
      control: false,
      option: true,
      command: false,
    };

    expect(typeof modifiers.shift).toBe('boolean');
    expect(typeof modifiers.control).toBe('boolean');
    expect(typeof modifiers.option).toBe('boolean');
    expect(typeof modifiers.command).toBe('boolean');
  });

  test('ApplicationInfo should have name and processId', () => {
    const appInfo: ApplicationInfo = {
      name: 'TestApp',
      processId: 1234,
    };

    expect(typeof appInfo.name).toBe('string');
    expect(typeof appInfo.processId).toBe('number');
  });

  test('TargetDescriptor should contain AX element info', () => {
    const descriptor: TargetDescriptor = {
      role: 'AXButton',
      title: 'Send',
      identifier: 'send-btn',
      value: '',
      frame: { x: 100, y: 200, width: 80, height: 30 },
      ancestry: ['AXApplication', 'AXWindow', 'AXButton'],
    };

    expect(typeof descriptor.role).toBe('string');
    expect(typeof descriptor.title).toBe('string');
    expect(typeof descriptor.identifier).toBe('string');
    expect(typeof descriptor.value).toBe('string');
    expect(Array.isArray(descriptor.ancestry)).toBe(true);
  });

  test('RecordedStep should contain complete step information', () => {
    const step: RecordedStep = {
      timestamp: Date.now(),
      sessionId: 'test-session',
      action: 'click',
      button: 'left',
      text: undefined,
      location: { x: 100, y: 200 },
      modifiers: {
        shift: false,
        control: false,
        option: false,
        command: false,
      },
      targetDescriptor: {
        role: 'AXButton',
        title: 'Click Me',
        identifier: 'btn1',
        value: '',
        frame: { x: 100, y: 200, width: 80, height: 30 },
        ancestry: [],
      },
      appInfo: { name: 'TestApp', processId: 1234 },
    };

    expect(typeof step.timestamp).toBe('number');
    expect(typeof step.sessionId).toBe('string');
    expect(['click', 'type', 'drag']).toContain(step.action);
  });

  test('FlowStep should support different step types', () => {
    const clickStep: FlowStep = {
      type: 'click',
      selector: '[role="button"]',
    };

    const typeStep: FlowStep = {
      type: 'type',
      selector: '[role="textfield"]',
      text: 'Hello World',
    };

    const navigateStep: FlowStep = {
      type: 'navigate',
      url: 'https://example.com',
    };

    expect(clickStep.type).toBe('click');
    expect(typeStep.type).toBe('type');
    expect(navigateStep.type).toBe('navigate');
  });

  test('FlowVariable should support different variable types', () => {
    const textVar: FlowVariable = {
      name: 'subject',
      type: 'text',
      required: true,
      default: 'Default Subject',
    };

    const tableVar: FlowVariable = {
      name: 'contacts',
      type: 'table',
      source: 'file',
    };

    expect(textVar.type).toBe('text');
    expect(tableVar.type).toBe('table');
    expect(typeof textVar.required).toBe('boolean');
  });

  test('Flow should contain complete flow definition', () => {
    const flow: Flow = {
      version: '0.1',
      name: 'Test Flow',
      variables: [
        {
          name: 'email',
          type: 'text',
          required: true,
        },
      ],
      steps: [
        {
          type: 'click',
          selector: '[role="button"]',
        },
        {
          type: 'type',
          selector: '[role="textfield"]',
          text: '{{email}}',
        },
      ],
    };

    expect(flow.version).toBe('0.1');
    expect(typeof flow.name).toBe('string');
    expect(Array.isArray(flow.variables)).toBe(true);
    expect(Array.isArray(flow.steps)).toBe(true);
    expect(flow.steps).toHaveLength(2);
  });
});
