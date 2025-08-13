#!/usr/bin/env node
/**
 * Sample usage of the macOS AX recorder
 * This demonstrates how to record user interactions and convert them to Flow DSL
 */
import { MacRecorder } from './index.js';
import * as fs from 'fs';
import * as path from 'path';
async function main() {
  console.log('🎬 macOS AX Recorder Sample');
  console.log('===========================\n');
  const recorder = new MacRecorder();
  // Set up event listeners
  recorder.on('recordingStarted', (sessionId) => {
    console.log(`✅ Recording started with session ID: ${sessionId}`);
    console.log('📝 Interact with any macOS application...');
    console.log('⏹️  Press Ctrl+C to stop recording\n');
  });
  recorder.on('stepRecorded', (step) => {
    const { action, targetDescriptor, appInfo, text } = step;
    const target = targetDescriptor.title || targetDescriptor.role || 'unknown';
    if (action === 'click') {
      console.log(`👆 Click: ${target} in ${appInfo.name}`);
    } else if (action === 'type' && text) {
      const displayText =
        text.length > 20 ? text.substring(0, 20) + '...' : text;
      console.log(`⌨️  Type: "${displayText}" in ${target}`);
    } else if (action === 'drag') {
      console.log(`🖱️  Drag: ${target} in ${appInfo.name}`);
    }
  });
  recorder.on('recordingStopped', () => {
    console.log('\n🛑 Recording stopped');
  });
  recorder.on('error', (error) => {
    console.error('❌ Recording error:', error.message);
  });
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Stopping recording...');
    if (recorder.isRecording()) {
      try {
        const steps = await recorder.stopRecording();
        if (steps.length > 0) {
          console.log(`\n📊 Recorded ${steps.length} steps:`);
          // Convert to Flow DSL
          const flow = recorder.convertToFlow(steps, 'Sample Recorded Flow');
          // Save the flow
          const outputPath = path.join(__dirname, '../samples');
          if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
          }
          const flowFile = path.join(outputPath, 'recorded-flow.json');
          const stepsFile = path.join(outputPath, 'recorded-steps.json');
          fs.writeFileSync(flowFile, JSON.stringify(flow, null, 2));
          fs.writeFileSync(stepsFile, JSON.stringify(steps, null, 2));
          console.log(`\n💾 Flow saved to: ${flowFile}`);
          console.log(`📁 Raw steps saved to: ${stepsFile}`);
          // Display summary
          console.log('\n📈 Flow Summary:');
          console.log(`   Name: ${flow.name}`);
          console.log(`   Version: ${flow.version}`);
          console.log(`   Variables: ${flow.variables.length}`);
          console.log(`   Steps: ${flow.steps.length}`);
          if (flow.steps.length > 0) {
            console.log('\n📝 Flow Steps:');
            flow.steps.forEach((step, index) => {
              let stepDesc = `   ${index + 1}. ${step.type}`;
              if (step.selector) {
                stepDesc += ` → ${step.selector}`;
              }
              if (step.text) {
                const displayText =
                  step.text.length > 30
                    ? step.text.substring(0, 30) + '...'
                    : step.text;
                stepDesc += ` (text: "${displayText}")`;
              }
              if (step.url) {
                stepDesc += ` (url: ${step.url})`;
              }
              console.log(stepDesc);
            });
          }
        } else {
          console.log('\n📭 No steps were recorded');
        }
      } catch (error) {
        console.error('❌ Error stopping recording:', error);
      }
    }
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
  // Start recording
  try {
    const sessionId = `sample-${Date.now()}`;
    await recorder.startRecording(sessionId);
    // Keep the process alive
    setInterval(() => {
      // This keeps the Node.js event loop running
    }, 1000);
  } catch (error) {
    console.error('❌ Failed to start recording:', error);
    console.log('\n💡 Make sure you have granted Accessibility permissions:');
    console.log(
      '   1. Open System Settings → Privacy & Security → Accessibility'
    );
    console.log('   2. Add your terminal/Node.js to the allowed applications');
    console.log('   3. Also grant Screen Recording permissions if needed');
    process.exit(1);
  }
}
// Sample Flow DSL structure for reference
const sampleFlow = {
  version: '0.1',
  name: 'Weekly Outreach',
  variables: [
    { name: 'sheet', type: 'table', source: 'file' },
    { name: 'subject', type: 'text' },
    { name: 'template', type: 'text' },
  ],
  steps: [
    { type: 'open_app', app: 'chromium' },
    { type: 'navigate', url: 'https://mail.google.com' },
    { type: 'wait_for', selector: '[role="button"][gh="cm"]' },
    { type: 'click', selector: '[role="button"][gh="cm"]' },
    { type: 'type', selector: 'textarea[name="to"]', text: '{{row.email}}' },
    { type: 'type', selector: 'input[name="subjectbox"]', text: '{{subject}}' },
    {
      type: 'type',
      selector: 'div[aria-label="Message Body"]',
      text: 'Hello {{row.name}},\n{{template}}',
    },
    { type: 'click', selector: 'div[aria-label="Send ‪(Ctrl-Enter)‬"]' },
    { type: 'guard', condition: 'gmail_sent_count_increases' },
  ],
};
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Sample failed:', error);
    process.exit(1);
  });
}
export { sampleFlow };
//# sourceMappingURL=sample.js.map
