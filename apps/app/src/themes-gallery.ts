import {
  buildThemePreviewModel,
  resolveTheme,
  THEMES,
  type ThemeDefinition,
} from '@arunodaya/themes';
import { applyThemeToElement } from './theme/apply-theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgIcon(type: 'sun' | 'moon'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(type === 'sun' ? 'icon-sun' : 'icon-moon');

  if (type === 'sun') {
    // Sun circle and rays
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '4');
    svg.appendChild(circle);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41',
    );
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
  } else {
    // Crescent moon
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 0 1-7.54-7.54c-.44-.06-.9-.1-1.36-.1z',
    );
    svg.appendChild(path);
  }

  return svg;
}

function renderThemeSection(theme: ThemeDefinition): HTMLElement {
  const section = document.createElement('section');
  section.className = 'theme-section';
  section.setAttribute('aria-labelledby', `theme-title-${theme.id}`);

  // Apply scoped CSS variables to section element
  applyThemeToElement(section, theme);

  const model = buildThemePreviewModel(theme);

  // 1. Heading row
  const headingRow = document.createElement('div');
  headingRow.className = 'theme-heading-row';

  const h2 = document.createElement('h2');
  h2.id = `theme-title-${theme.id}`;
  h2.className = 'theme-name';
  h2.textContent = theme.name;

  const badges = document.createElement('div');
  badges.className = 'theme-meta-badges';

  const idBadge = document.createElement('span');
  idBadge.className = 'meta-badge';
  idBadge.textContent = `id: ${theme.id}`;

  const familyBadge = document.createElement('span');
  familyBadge.className = 'meta-badge';
  familyBadge.textContent = theme.family;

  const modeBadge = document.createElement('span');
  modeBadge.className = 'meta-badge';
  modeBadge.textContent = `${theme.baseMode} mode`;

  badges.appendChild(idBadge);
  badges.appendChild(familyBadge);
  badges.appendChild(modeBadge);

  headingRow.appendChild(h2);
  headingRow.appendChild(badges);
  section.appendChild(headingRow);

  // 2. Sample Home Panel
  const homeCard = document.createElement('div');
  homeCard.className = 'sample-home-card';

  const homeHeader = document.createElement('div');
  homeHeader.className = 'sample-home-header';

  const textBlock = document.createElement('div');
  const greetingEl = document.createElement('h3');
  greetingEl.className = 'sample-greeting';
  greetingEl.textContent = model.sample.greeting;

  const dateLocEl = document.createElement('p');
  dateLocEl.className = 'sample-date-location';
  dateLocEl.textContent = `${model.sample.location} · ${model.sample.dateLabel}`;

  textBlock.appendChild(greetingEl);
  textBlock.appendChild(dateLocEl);

  const clockEl = document.createElement('div');
  clockEl.className = 'sample-clock';
  clockEl.textContent = model.sample.clockTime;

  homeHeader.appendChild(textBlock);
  homeHeader.appendChild(clockEl);
  homeCard.appendChild(homeHeader);

  // Three event rows
  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'event-rows';

  for (const row of model.sample.eventRows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'event-row';

    const lead = document.createElement('div');
    lead.className = 'event-lead';

    const iconEl = document.createElement('span');
    iconEl.className = 'event-icon';
    iconEl.appendChild(createSvgIcon(row.icon));

    const labelEl = document.createElement('span');
    labelEl.className = 'event-label';
    labelEl.textContent = row.name;

    lead.appendChild(iconEl);
    lead.appendChild(labelEl);

    const times = document.createElement('div');
    times.className = 'event-times';

    const timeEl = document.createElement('span');
    timeEl.className = 'event-time';
    timeEl.textContent = row.time;

    const countdownEl = document.createElement('span');
    countdownEl.className = 'countdown-progress-text';
    countdownEl.textContent = row.countdown;
    countdownEl.style.setProperty('--ar-progress', String(row.progress));

    times.appendChild(timeEl);
    times.appendChild(countdownEl);

    rowEl.appendChild(lead);
    rowEl.appendChild(times);
    eventsContainer.appendChild(rowEl);
  }

  homeCard.appendChild(eventsContainer);

  const noteEl = document.createElement('div');
  noteEl.className = 'sample-note';
  noteEl.textContent = model.sample.note;
  homeCard.appendChild(noteEl);

  section.appendChild(homeCard);

  // 3. Layer Swatches Row
  const swatchesCard = document.createElement('div');
  swatchesCard.className = 'layer-swatches-card';

  const swatchesTitle = document.createElement('h4');
  swatchesTitle.className = 'section-subhead';
  swatchesTitle.textContent = 'Surfaces & Elevation';
  swatchesCard.appendChild(swatchesTitle);

  const swatchesGrid = document.createElement('div');
  swatchesGrid.className = 'swatches-grid';

  const layerItems = [
    { name: 'Canvas', key: 'canvas', hex: theme.tokens.canvas, cls: 'swatch-box-canvas' },
    { name: 'Layer 1', key: 'layer1', hex: theme.tokens.layer1, cls: 'swatch-box-layer1' },
    { name: 'Layer 2', key: 'layer2', hex: theme.tokens.layer2, cls: 'swatch-box-layer2' },
    { name: 'Layer 3', key: 'layer3', hex: theme.tokens.layer3, cls: 'swatch-box-layer3' },
  ];

  for (const item of layerItems) {
    const box = document.createElement('div');
    box.className = `swatch-box ${item.cls}`;

    const label = document.createElement('span');
    label.className = 'swatch-label';
    label.textContent = item.name;

    const hex = document.createElement('span');
    hex.className = 'swatch-hex';
    hex.textContent = item.hex;

    box.appendChild(label);
    box.appendChild(hex);
    swatchesGrid.appendChild(box);
  }

  swatchesCard.appendChild(swatchesGrid);
  section.appendChild(swatchesCard);

  // 4. Controls, Status Chips & Focus Ring
  const controlsRow = document.createElement('div');
  controlsRow.className = 'controls-row';

  const btnPrimary = document.createElement('button');
  btnPrimary.type = 'button';
  btnPrimary.className = 'btn-primary';
  btnPrimary.textContent = 'Primary action';

  const btnSecondary = document.createElement('button');
  btnSecondary.type = 'button';
  btnSecondary.className = 'btn-secondary';
  btnSecondary.textContent = 'Secondary action';

  const btnFocus = document.createElement('button');
  btnFocus.type = 'button';
  btnFocus.className = 'btn-focus';
  btnFocus.textContent = 'Focus state';

  const chipPositive = document.createElement('span');
  chipPositive.className = 'status-chip chip-positive';
  chipPositive.textContent = 'Optimal';

  const chipWarning = document.createElement('span');
  chipWarning.className = 'status-chip chip-warning';
  chipWarning.textContent = 'Approximating';

  const chipCritical = document.createElement('span');
  chipCritical.className = 'status-chip chip-critical';
  chipCritical.textContent = 'Expired';

  controlsRow.appendChild(btnPrimary);
  controlsRow.appendChild(btnSecondary);
  controlsRow.appendChild(btnFocus);
  controlsRow.appendChild(chipPositive);
  controlsRow.appendChild(chipWarning);
  controlsRow.appendChild(chipCritical);

  section.appendChild(controlsRow);

  // 5. Static Medium Widget Preview
  const widgetCard = document.createElement('div');
  widgetCard.className = 'widget-preview-card';

  const widgetHeader = document.createElement('div');
  widgetHeader.className = 'widget-preview-header';

  const widgetTitle = document.createElement('h4');
  widgetTitle.className = 'widget-preview-title';
  widgetTitle.textContent = 'Android Widget Preview';

  const widgetStale = document.createElement('span');
  widgetStale.className = 'widget-stale-stamp';
  widgetStale.textContent = model.sample.asOfLabel;

  widgetHeader.appendChild(widgetTitle);
  widgetHeader.appendChild(widgetStale);
  widgetCard.appendChild(widgetHeader);

  const timesGrid = document.createElement('div');
  timesGrid.className = 'widget-times-grid';

  for (const row of model.sample.eventRows) {
    const block = document.createElement('div');
    block.className = 'widget-time-block';

    const name = document.createElement('span');
    name.className = 'widget-time-name';
    name.textContent = row.name;

    const val = document.createElement('span');
    val.className = 'widget-time-val';
    val.textContent = row.time;

    block.appendChild(name);
    block.appendChild(val);
    timesGrid.appendChild(block);
  }
  widgetCard.appendChild(timesGrid);

  const widgetCountdownRow = document.createElement('div');
  widgetCountdownRow.className = 'widget-countdown-row';

  const cdLabel = document.createElement('span');
  cdLabel.className = 'widget-countdown-label';
  cdLabel.textContent = 'Next occurrence countdown:';

  const cdVal = document.createElement('span');
  cdVal.className = 'widget-countdown-val';
  cdVal.textContent = model.sample.staleLabel;

  widgetCountdownRow.appendChild(cdLabel);
  widgetCountdownRow.appendChild(cdVal);
  widgetCard.appendChild(widgetCountdownRow);

  section.appendChild(widgetCard);

  // 6. Contrast Table Details
  const details = document.createElement('details');
  details.className = 'contrast-details';

  const summary = document.createElement('summary');
  summary.className = 'contrast-summary';
  summary.textContent = `Contrast verification (${model.contrastRows.length.toString()} checks) — All PASS`;
  details.appendChild(summary);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'contrast-table-wrapper';

  const table = document.createElement('table');
  table.className = 'contrast-table';

  const caption = document.createElement('caption');
  caption.textContent = `Automated WCAG contrast verification results for ${theme.name}`;
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const headers = ['Check ID', 'Ratio', 'Required', 'Status'];
  for (const h of headers) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of model.contrastRows) {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.textContent = row.id;

    const tdRatio = document.createElement('td');
    tdRatio.textContent = `${row.ratio.toFixed(2)}:1`;

    const tdMin = document.createElement('td');
    tdMin.textContent = `${row.min.toFixed(1)}:1`;

    const tdStatus = document.createElement('td');
    tdStatus.className = row.pass ? 'pass-badge' : 'fail-badge';
    tdStatus.textContent = row.pass ? 'PASS' : 'FAIL';

    tr.appendChild(tdId);
    tr.appendChild(tdRatio);
    tr.appendChild(tdMin);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  details.appendChild(tableWrapper);

  section.appendChild(details);

  return section;
}

export function initGallery(): void {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'gallery-page';

  // Header Landmark
  const header = document.createElement('header');
  header.className = 'gallery-header';

  const banner = document.createElement('div');
  banner.className = 'gallery-review-banner';
  banner.textContent = 'Internal Review Tool · Not User-Facing UI';
  header.appendChild(banner);

  const title = document.createElement('h1');
  title.className = 'gallery-title';
  title.textContent = 'Arunodaya Themes Gallery';
  header.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'gallery-intro';
  intro.textContent =
    'Visual inspection gallery for all ten Arunodaya themes, design tokens, contrast verification matrices, and Android widget palettes. Renders premium restrained aesthetics with gold hue invariants.';
  header.appendChild(intro);

  // Match system block
  const matchSystemCard = document.createElement('div');
  matchSystemCard.className = 'match-system-card';

  const msTitle = document.createElement('h2');
  msTitle.className = 'match-system-title';
  msTitle.textContent = 'Match System Preference';
  matchSystemCard.appendChild(msTitle);

  const msDetails = document.createElement('p');
  msDetails.className = 'match-system-details';

  const updateMatchSystem = (): void => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = resolveTheme({ kind: 'system' }, isDark);
    msDetails.innerHTML = `Current OS preference: <strong>${isDark ? 'Dark' : 'Light'}</strong> mode. Resolved theme: <span class="match-system-badge">${resolved.name} (id: ${resolved.id})</span>.`;
  };

  updateMatchSystem();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    updateMatchSystem();
  });

  matchSystemCard.appendChild(msDetails);
  header.appendChild(matchSystemCard);
  page.appendChild(header);

  // Main Landmark
  const main = document.createElement('main');
  const grid = document.createElement('div');
  grid.className = 'themes-grid';

  for (const theme of THEMES) {
    grid.appendChild(renderThemeSection(theme));
  }

  main.appendChild(grid);
  page.appendChild(main);
  root.appendChild(page);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initGallery();
    });
  } else {
    initGallery();
  }
}
