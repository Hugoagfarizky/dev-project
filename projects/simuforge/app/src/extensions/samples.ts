import type { ExtensionEntry } from './types.ts';

/**
 * Built-in sample extension used by the Extension Manager and the Phase 10
 * browser smoke test. It is a normal project-local extension: nothing about it
 * bypasses manifest validation, permission checks, or worker isolation.
 */
export const SAMPLE_EXTENSION: ExtensionEntry = {
  manifest: {
    id: '3f2a9c1e-8b4d-4f6a-9c2e-1d7b5a3f9e01',
    name: 'Oscillator Sample',
    version: '1.0.0',
    apiVersion: 1,
    author: 'SimuForge',
    components: [
      {
        type: 'sampleOscillator',
        label: 'Sample Oscillator',
        category: 'extension',
        description: 'A sine oscillator component provided by a project-local extension.',
        defaultConfig: { frequency: 1, amplitude: 1 }
      }
    ],
    modules: [{ id: 'oscillator', hooks: ['onPlay', 'onTick'] }],
    permissions: ['read:world', 'write:components', 'run:simulation-hooks']
  },
  source: `registerModule('oscillator', {
  onPlay(payload) {
    return 0;
  },
  onTick(payload) {
    const frequency = 1;
    return Math.sin(payload.time * Math.PI * 2 * frequency);
  }
});
`,
  enabled: true
};

export function createSampleExtensionEntry(): ExtensionEntry {
  return JSON.parse(JSON.stringify(SAMPLE_EXTENSION)) as ExtensionEntry;
}
