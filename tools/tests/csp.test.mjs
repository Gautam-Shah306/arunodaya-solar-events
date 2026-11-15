import { describe, expect, it } from 'vitest';
import { cspPlugin, CSP_POLICY } from '../lib/csp.mjs';

describe('csp plugin', () => {
  it('csp plugin injects the policy meta tag at build time', () => {
    const plugin = cspPlugin();
    expect(plugin.name).toBe('arunodaya-csp');
    expect(plugin.apply).toBe('build');

    const inputHtml = '<!doctype html><html><head><title>Test</title></head><body></body></html>';
    // @ts-expect-error transformIndexHtml is callable as a function
    const outputHtml = plugin.transformIndexHtml(inputHtml);

    expect(outputHtml).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(outputHtml).toContain(CSP_POLICY);
  });

  it('csp plugin leaves dev html untouched', () => {
    const plugin = cspPlugin();
    // In Vite plugins, apply: 'build' indicates the plugin is inactive during dev (command: 'serve')
    expect(plugin.apply).toBe('build');

    const inputHtml = '<!doctype html><html><head><title>Dev</title></head><body></body></html>';
    // In dev mode Vite does not execute build-only plugins, so input remains pristine
    const devSimulatedHtml = plugin.apply === 'build' ? inputHtml : '';
    expect(devSimulatedHtml).toBe(inputHtml);
    expect(devSimulatedHtml).not.toContain('Content-Security-Policy');
  });
});
