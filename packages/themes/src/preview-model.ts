import { evaluateTheme, type ContrastEvaluationResult } from './contrast.js';
import type { SemanticTokenName, ThemeDefinition, WidgetTokenName } from './types.js';

export interface TokenSwatch<TName extends string = string> {
  readonly name: TName;
  readonly value: string;
}

export interface SampleEventRow {
  readonly name: string;
  readonly time: string;
  readonly countdown: string;
  readonly progress: number;
  readonly icon: 'sun' | 'moon';
}

export interface ThemeSamplePreview {
  readonly greeting: string;
  readonly dateLabel: string;
  readonly location: string;
  readonly clockTime: string;
  readonly eventRows: readonly SampleEventRow[];
  readonly staleLabel: string;
  readonly asOfLabel: string;
  readonly note: string;
}

export interface ThemePreviewModel {
  readonly tokenSwatches: readonly TokenSwatch<SemanticTokenName>[];
  readonly widgetSwatches: readonly TokenSwatch<WidgetTokenName>[];
  readonly contrastRows: readonly ContrastEvaluationResult[];
  readonly sample: ThemeSamplePreview;
}

/**
 * Builds a deterministic preview model for a theme including swatches, contrast evaluations,
 * and static visual sample values.
 */
export function buildThemePreviewModel(theme: ThemeDefinition): ThemePreviewModel {
  const tokenSwatches: TokenSwatch<SemanticTokenName>[] = Object.entries(theme.tokens).map(
    ([name, value]) => ({
      name: name as SemanticTokenName,
      value,
    }),
  );

  const widgetSwatches: TokenSwatch<WidgetTokenName>[] = Object.entries(theme.widget).map(
    ([name, value]) => ({
      name: name as WidgetTokenName,
      value,
    }),
  );

  const contrastRows = evaluateTheme(theme);

  const sample: ThemeSamplePreview = {
    greeting: 'Good evening',
    dateLabel: 'Monday, 16 November 2026',
    location: 'Rajkot',
    clockTime: '15:01',
    eventRows: [
      {
        name: 'Sunrise',
        time: '06:49',
        countdown: '02h 48m',
        progress: 0.35,
        icon: 'sun',
      },
      {
        name: 'Navkarshi',
        time: '07:37',
        countdown: '02h 48m',
        progress: 0.6,
        icon: 'sun',
      },
      {
        name: 'Sunset',
        time: '17:49',
        countdown: '02h 48m',
        progress: 0.85,
        icon: 'moon',
      },
    ],
    staleLabel: '\u2248 02h 48m',
    asOfLabel: 'as of 18:05',
    note: 'Sample values, not calculated',
  };

  return {
    tokenSwatches,
    widgetSwatches,
    contrastRows,
    sample,
  };
}
