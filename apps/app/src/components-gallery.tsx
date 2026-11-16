import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getTheme, THEME_IDS, type ThemeId } from '@arunodaya/themes';
import { Countdown } from './ui/Countdown.js';
import { countdownParts } from './ui/rolling-digits-model.js';
import { applyThemeToElement } from './theme/apply-theme.js';

import './styles/fonts.css';
import './styles/base.css';
import './styles/components-gallery.css';

const ALL_THEMES: readonly ThemeId[] = THEME_IDS;

export const ComponentsGallery: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeId>('light');
  const [interactiveMinutes, setInteractiveMinutes] = useState(168); // 02h 48m

  function handleThemeChange(id: ThemeId): void {
    setActiveTheme(id);
    const themeDef = getTheme(id);
    if (themeDef) {
      applyThemeToElement(document.documentElement, themeDef);
    }
  }

  function step(delta: number): void {
    setInteractiveMinutes((prev) => Math.max(0, prev + delta));
  }

  return (
    <div className="ar-gallery-container">
      <h1 className="ar-gallery-title">Components Gallery</h1>

      {/* Theme selector */}
      <section className="ar-gallery-section" aria-label="Theme Selection">
        <h2>Theme Preview ({activeTheme})</h2>
        <div className="ar-theme-selector" role="radiogroup">
          {ALL_THEMES.map((themeId) => (
            <button
              key={themeId}
              type="button"
              className="ar-theme-btn"
              data-active={activeTheme === themeId ? 'true' : 'false'}
              onClick={() => {
                handleThemeChange(themeId);
              }}
            >
              {themeId}
            </button>
          ))}
        </div>
      </section>

      {/* Countdowns preview */}
      <section className="ar-gallery-section" aria-label="Countdown Previews">
        <h2>Countdowns</h2>
        <div className="ar-gallery-countdown-row">
          <div className="ar-gallery-countdown-item">
            <span className="ar-gallery-countdown-label">
              Primary (02h 48m / 168 min, 42% progress)
            </span>
            <Countdown
              remainingMinutes={168}
              progress={0.42}
              srLabel="Navkarshi in 2 hours 48 minutes"
              isPrimary={true}
            />
          </div>

          <div className="ar-gallery-countdown-item">
            <span className="ar-gallery-countdown-label">
              Secondary (00h 01m / 1 min, 98% progress)
            </span>
            <Countdown
              remainingMinutes={1}
              progress={0.98}
              srLabel="Sunrise in 1 minute"
              isPrimary={false}
            />
          </div>
        </div>

        {/* Interactive rolling digit testing */}
        <h3>Interactive Rolling Test</h3>
        <p>Current: {countdownParts(interactiveMinutes).text}</p>
        <Countdown
          remainingMinutes={interactiveMinutes}
          progress={0.5}
          srLabel="Interactive event test"
          isPrimary={true}
        />
        <div className="ar-gallery-controls">
          <button
            type="button"
            className="ar-gallery-step-btn"
            onClick={() => {
              step(-1);
            }}
          >
            -1m
          </button>
          <button
            type="button"
            className="ar-gallery-step-btn"
            onClick={() => {
              step(1);
            }}
          >
            +1m
          </button>
          <button
            type="button"
            className="ar-gallery-step-btn"
            onClick={() => {
              step(-60);
            }}
          >
            -1h
          </button>
          <button
            type="button"
            className="ar-gallery-step-btn"
            onClick={() => {
              step(60);
            }}
          >
            +1h
          </button>
        </div>
      </section>

      {/* Digit specimen row */}
      <section className="ar-gallery-section" aria-label="Figure Alignment Specimen">
        <h2>Digit Specimen (48px Gelasio Tabular Lining Figures)</h2>
        <p>
          Top dashed line indicates cap-height; lower accent dashed line indicates the baseline.
        </p>
        <div className="ar-gallery-specimen-wrap">
          <div className="ar-gallery-specimen-guide-top" />
          <div className="ar-gallery-specimen-guide-baseline" />
          <div className="ar-gallery-specimen ar-tnum">0123456789</div>
        </div>
      </section>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<ComponentsGallery />);
}
