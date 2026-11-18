import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getTheme, isThemeId, THEME_IDS, type ThemeId } from '@arunodaya/themes';
import { Countdown } from './ui/Countdown.js';
import { countdownParts } from './ui/rolling-digits-model.js';
import { applyThemeToElement } from './theme/apply-theme.js';

import './styles/fonts.css';
import './styles/base.css';
import './styles/components-gallery.css';

const ALL_THEMES: readonly ThemeId[] = THEME_IDS;

function resolveInitialTheme(): ThemeId {
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('theme');
    if (param && isThemeId(param)) {
      return param;
    }
  }
  return 'light';
}

export const ComponentsGallery: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeId>(resolveInitialTheme);
  const [interactiveMinutes, setInteractiveMinutes] = useState(168); // 02h 48m

  useEffect(() => {
    const themeDef = getTheme(activeTheme);
    if (themeDef) {
      applyThemeToElement(document.documentElement, themeDef);
    }
  }, [activeTheme]);

  function handleThemeChange(id: ThemeId): void {
    setActiveTheme(id);
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
        <section id="rolling-lab" className="ar-gallery-sub-section" aria-label="Rolling Lab">
          <h3>Interactive Rolling Lab</h3>
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
              id="step-down-1m"
              className="ar-gallery-step-btn"
              onClick={() => {
                step(-1);
              }}
            >
              -1m
            </button>
            <button
              type="button"
              id="step-up-1m"
              className="ar-gallery-step-btn"
              onClick={() => {
                step(1);
              }}
            >
              +1m
            </button>
            <button
              type="button"
              id="set-rollover-3h"
              className="ar-gallery-step-btn"
              onClick={() => {
                setInteractiveMinutes(180); // 03h 00m
              }}
            >
              Set 03h 00m
            </button>
            <button
              type="button"
              id="set-rollover-2h59"
              className="ar-gallery-step-btn"
              onClick={() => {
                setInteractiveMinutes(179); // 02h 59m
              }}
            >
              Set 02h 59m
            </button>
            <button
              type="button"
              id="set-rollover-10h"
              className="ar-gallery-step-btn"
              onClick={() => {
                setInteractiveMinutes(600); // 10h 00m
              }}
            >
              Set 10h 00m
            </button>
            <button
              type="button"
              id="set-rollover-9h59"
              className="ar-gallery-step-btn"
              onClick={() => {
                setInteractiveMinutes(599); // 09h 59m
              }}
            >
              Set 09h 59m
            </button>
            <button
              type="button"
              id="set-rollover-59m"
              className="ar-gallery-step-btn"
              onClick={() => {
                setInteractiveMinutes(59); // 00h 59m
              }}
            >
              Set 00h 59m
            </button>
            <button
              type="button"
              id="set-rollover-1h"
              className="ar-gallery-step-btn"
              onClick={() => {
                setInteractiveMinutes(60); // 01h 00m
              }}
            >
              Set 01h 00m
            </button>
          </div>
        </section>
      </section>

      {/* Digit specimen row */}
      <section className="ar-gallery-section" aria-label="Figure Alignment Specimen">
        <h2>Digit Specimens (Playfair Display Lining Figures)</h2>
        <p>
          48px Display: Top dashed line indicates cap-height; lower accent dashed line indicates
          baseline.
        </p>
        <div className="ar-gallery-specimen-wrap">
          <div className="ar-gallery-specimen-guide-top" />
          <div className="ar-gallery-specimen-guide-baseline" />
          <div className="ar-gallery-specimen ar-num ar-specimen-48">0123456789</div>
        </div>

        <p>20px Auxiliary:</p>
        <div className="ar-gallery-specimen-wrap">
          <div className="ar-gallery-specimen ar-num ar-specimen-20">0123456789</div>
        </div>
      </section>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<ComponentsGallery />);
}
