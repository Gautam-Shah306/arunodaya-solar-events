import { contrastRatio, deltaE } from './color.js';
import { CONTRAST_CHECKS } from './contrast-spec.js';
import type { ThemeDefinition, SemanticTokenName, WidgetTokenName } from './types.js';

/**
 * Result of evaluating a single contrast check against a theme.
 */
export interface ContrastEvaluationResult {
  /** Identifier of the check */
  readonly id: string;
  /** Measured WCAG contrast ratio */
  readonly ratio: number;
  /** Required minimum contrast ratio */
  readonly min: number;
  /** Whether the measured ratio satisfies the requirement */
  readonly pass: boolean;
  /** Resolved hex colour for foreground */
  readonly fg: string;
  /** Resolved hex colour for background */
  readonly bg: string;
}

/**
 * Evaluates all 45 contrast checks against a theme definition.
 */
export function evaluateTheme(theme: ThemeDefinition): ContrastEvaluationResult[] {
  const results: ContrastEvaluationResult[] = [];

  for (const check of CONTRAST_CHECKS) {
    let fgHex: string;
    let bgHex: string;

    if (check.scope === 'tokens') {
      fgHex = theme.tokens[check.fg as SemanticTokenName];
      bgHex = theme.tokens[check.bg as SemanticTokenName];
    } else {
      fgHex = theme.widget[check.fg as WidgetTokenName];
      bgHex = theme.widget[check.bg as WidgetTokenName];
    }

    const ratio = contrastRatio(fgHex, bgHex);
    // Round to 2 decimal places to avoid floating point precision artifacts (e.g. 6.9999999999)
    const roundedRatio = Math.round(ratio * 100) / 100;
    const pass = roundedRatio >= check.min;

    results.push({
      id: check.id,
      ratio: roundedRatio,
      min: check.min,
      pass,
      fg: fgHex,
      bg: bgHex,
    });
  }

  return results;
}

/**
 * Filters evaluation results returning only failing checks.
 */
export function failingChecks(
  results: readonly ContrastEvaluationResult[],
): ContrastEvaluationResult[] {
  return results.filter((r) => !r.pass);
}

/**
 * Distinctness issue describing two theme canvases that are perceptually too close.
 */
export interface DistinctnessIssue {
  readonly themeA: string;
  readonly themeB: string;
  readonly canvasA: string;
  readonly canvasB: string;
  readonly deltaE: number;
  readonly minDeltaE: number;
}

/**
 * Evaluates pairwise perceptual distinctness across theme canvases using CIE76 Delta E.
 */
export function evaluateDistinctness(
  themes: readonly ThemeDefinition[],
  options?: { readonly minCanvasDeltaE?: number },
): DistinctnessIssue[] {
  const minDelta = options?.minCanvasDeltaE ?? 6;
  const issues: DistinctnessIssue[] = [];

  themes.forEach((a, i) => {
    themes.slice(i + 1).forEach((b) => {
      const dE = deltaE(a.tokens.canvas, b.tokens.canvas);
      if (dE < minDelta) {
        issues.push({
          themeA: a.id,
          themeB: b.id,
          canvasA: a.tokens.canvas,
          canvasB: b.tokens.canvas,
          deltaE: Math.round(dE * 100) / 100,
          minDeltaE: minDelta,
        });
      }
    });
  });

  return issues;
}
