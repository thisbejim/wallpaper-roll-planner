import {
  DEFAULTS,
  UNIT_SYSTEMS,
  calculatePlan,
  displayBaseLength,
  formatMoney,
  formatNumber,
} from './calc.js';

const form = document.querySelector('#planner-form');
const inputs = {
  wallRun: document.querySelector('#wall-run'),
  wallHeight: document.querySelector('#wall-height'),
  fullHeightOpenings: document.querySelector('#openings'),
  rollWidth: document.querySelector('#roll-width'),
  rollLength: document.querySelector('#roll-length'),
  repeat: document.querySelector('#repeat'),
  match: document.querySelector('#match'),
  trim: document.querySelector('#trim'),
  spareRolls: document.querySelector('#spare-rolls'),
  pricePerRoll: document.querySelector('#price'),
  currency: document.querySelector('#currency'),
};

const appState = {
  system: 'imperial',
  currency: 'USD',
  plan: null,
};

const unitLabels = document.querySelectorAll('[data-unit]');
const formError = document.querySelector('#form-error');
const actionStatus = document.querySelector('#action-status');
const matchHelp = document.querySelector('#match-help');

const conversion = {
  wallRun: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 0.3048 : value / 0.3048),
  wallHeight: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 0.3048 : value / 0.3048),
  fullHeightOpenings: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 0.3048 : value / 0.3048),
  rollWidth: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 2.54 : value / 2.54),
  rollLength: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 0.3048 : value / 0.3048),
  repeat: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 2.54 : value / 2.54),
  trim: (value, from, to) => from === to ? value : (from === 'imperial' ? value * 2.54 : value / 2.54),
};

function roundForInput(value, key, system) {
  if (!Number.isFinite(value)) return value;
  const decimals = system === 'metric'
    ? (key === 'rollWidth' || key === 'repeat' || key === 'trim' ? 1 : 2)
    : (key === 'rollWidth' ? 1 : 2);
  return Number(value.toFixed(decimals));
}

function readInputs() {
  const values = {};
  for (const [key, element] of Object.entries(inputs)) {
    if (key === 'match' || key === 'currency') values[key] = element.value;
    else if (key === 'spareRolls') values[key] = Number.parseInt(element.value, 10);
    else values[key] = Number(element.value);
  }
  values.system = appState.system;
  return values;
}

function setInputValue(element, value) {
  element.value = Number.isFinite(value) ? String(value) : '';
}

function updateUnitLabels() {
  const labels = UNIT_SYSTEMS[appState.system];
  for (const label of unitLabels) {
    const unit = label.dataset.unit;
    label.textContent = labels[unit] ?? unit;
  }
  document.querySelectorAll('.unit-button').forEach((button) => {
    const active = button.dataset.system === appState.system;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('.price-currency').textContent = appState.currency === 'EUR' ? '€' : appState.currency === 'GBP' ? '£' : appState.currency === 'AUD' ? 'A$' : appState.currency === 'CAD' ? 'C$' : '$';
}

function switchSystem(nextSystem) {
  if (nextSystem === appState.system) return;
  const previousSystem = appState.system;
  for (const key of Object.keys(conversion)) {
    const value = Number(inputs[key].value);
    if (Number.isFinite(value)) {
      setInputValue(inputs[key], roundForInput(conversion[key](value, previousSystem, nextSystem), key, nextSystem));
    }
  }
  appState.system = nextSystem;
  updateUnitLabels();
  recalculate();
}

function formatImperialInches(inches) {
  const safe = Math.max(0, inches);
  if (safe < 11.95) return `${formatNumber(safe, 1)} in`;
  const feet = Math.floor((safe + 0.001) / 12);
  const remaining = safe - feet * 12;
  if (remaining < 0.05) return `${feet} ft`;
  return `${feet} ft ${formatNumber(remaining, 1)} in`;
}

function formatBaseLength(value, system, kind = 'length') {
  const display = displayBaseLength(value, system, kind);
  if (system === 'imperial') {
    if (kind === 'width' || kind === 'repeat' || kind === 'trim') return `${formatNumber(value, 1)} in`;
    return formatImperialInches(value);
  }
  return `${formatNumber(display.value, display.unit === 'm' ? 2 : 1)} ${display.unit}`;
}

function formatBaseArea(value, system) {
  if (system === 'metric') return `${formatNumber(value / 10000, 1)} m²`;
  return `${formatNumber(value / 144, 1)} sq ft`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function setStatus(message) {
  actionStatus.textContent = message;
  window.clearTimeout(setStatus.timer);
  if (message) setStatus.timer = window.setTimeout(() => { actionStatus.textContent = ''; }, 3500);
}

function updateMatchHelp() {
  const match = inputs.match.value;
  const repeat = Number(inputs.repeat.value);
  inputs.repeat.setAttribute('aria-describedby', 'match-help');
  if (match === 'random') {
    matchHelp.textContent = 'No pattern allowance is added.';
    inputs.repeat.removeAttribute('aria-invalid');
  } else if (!repeat) {
    matchHelp.textContent = 'Enter the vertical repeat printed on the roll label.';
  } else if (match === 'straight') {
    matchHelp.textContent = 'Each drop rounds up to a whole repeat.';
  } else {
    matchHelp.textContent = 'A half-repeat allowance is reserved on alternating drops.';
  }
}

function recalculate() {
  updateMatchHelp();
  try {
    const values = readInputs();
    appState.currency = values.currency || appState.currency;
    const plan = calculatePlan(values);
    appState.plan = plan;
    setError('');
    renderPlan(plan);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Check the measurements and try again.');
  }
}

function renderPlan(plan) {
  const spareText = plan.spareRolls === 1 ? '1 spare' : `${plan.spareRolls} spares`;
  setText('#total-rolls', String(plan.totalRolls));
  setText('#roll-word', plan.totalRolls === 1 ? 'roll' : 'rolls');
  setText('#result-summary', `${plan.workingRolls} working ${plan.workingRolls === 1 ? 'roll' : 'rolls'} + ${spareText}`);
  setText('#drops-needed', String(plan.dropsNeeded));
  setText('#drops-per-roll', String(plan.dropsPerRoll));
  setText('#cut-length', formatBaseLength(plan.cutLengthBase, plan.system));
  const cost = plan.pricePerRoll > 0 ? formatMoney(plan.materialCost, appState.currency) : '—';
  setText('#cost', cost);
  setText('#cost-note', plan.pricePerRoll > 0 ? `${formatMoney(plan.pricePerRoll, appState.currency)} each` : 'add a price above');

  const patternText = plan.match === 'random'
    ? 'Plain paper leaves no pattern waste.'
    : plan.match === 'straight'
      ? `The ${formatBaseLength(plan.repeat, plan.system, 'repeat')} repeat adds ${formatBaseLength(plan.matchingAllowanceBase, plan.system)} to each cut.`
      : `Half-drop matching reserves ${formatBaseLength(plan.matchingAllowanceBase, plan.system)} beyond the trimmed drop.`;
  setText('#callout-title', patternText);
  setText('#callout-copy', `The plan uses ${formatBaseArea(plan.wasteLengthBase * plan.rollWidthBase, plan.system)} of roll material for trimming, matching and your spare roll.`);

  setText('#math-paper-run', formatBaseLength(plan.paperRunBase, plan.system));
  setText('#math-roll-width', formatBaseLength(plan.rollWidthBase, plan.system, 'width'));
  setText('#math-drops', `${plan.dropsNeeded} ${plan.dropsNeeded === 1 ? 'drop' : 'drops'}`);
  setText('#math-raw-length', formatBaseLength(plan.rawDropLengthBase, plan.system));
  setText('#math-roll-length', formatBaseLength(plan.system === 'metric' ? plan.rollLength * 100 : plan.rollLength * 12, plan.system));
  setText('#math-cut-length', formatBaseLength(plan.cutLengthBase, plan.system));
  setText('#math-yield', `${plan.dropsPerRoll} ${plan.dropsPerRoll === 1 ? 'drop' : 'drops'}`);
  setText('#math-working-rolls', `${plan.workingRolls} ${plan.workingRolls === 1 ? 'roll' : 'rolls'}`);
  setText('#math-spare', spareText);
  setText('#math-total-rolls', `${plan.totalRolls} ${plan.totalRolls === 1 ? 'roll' : 'rolls'}`);
  const repeatNote = plan.match === 'random' ? '' : `; rounded for ${plan.match === 'straight' ? 'straight' : 'half-drop'} match`;
  setText('#math-repeat-note', repeatNote);
  renderCutMap(plan);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderCutMap(plan) {
  const map = document.querySelector('#cut-map');
  map.replaceChildren();
  const heading = createElement('div', 'cut-map-heading');
  heading.append(createElement('span', '', 'Each rectangle is one drop.'));
  const legend = createElement('span', 'cut-legend');
  legend.append(createElement('i', 'legend-working'), createElement('span', '', 'working'), createElement('i', 'legend-spare'), createElement('span', '', 'spare'));
  heading.append(legend);
  map.append(heading);

  const visibleRolls = Math.min(plan.totalRolls, 14);
  const grid = createElement('div', 'roll-grid');
  for (let index = 0; index < visibleRolls; index += 1) {
    const spare = index >= plan.workingRolls;
    const drops = spare ? 0 : Math.min(plan.dropsPerRoll, Math.max(0, plan.dropsNeeded - index * plan.dropsPerRoll));
    const card = createElement('div', `roll-card${spare ? ' is-spare' : ''}`);
    const label = createElement('div', 'roll-label');
    label.append(createElement('strong', '', `Roll ${index + 1}`), createElement('span', '', spare ? 'spare' : `${drops} drops`));
    card.append(label);
    const dropsRow = createElement('div', 'drop-row');
    for (let drop = 0; drop < drops; drop += 1) {
      dropsRow.append(createElement('span', 'drop-chip', `#${index * plan.dropsPerRoll + drop + 1}`));
    }
    if (!drops) dropsRow.append(createElement('span', 'drop-chip empty', spare ? 'held back' : '—'));
    card.append(dropsRow);
    const remainder = plan.rollLength * (plan.system === 'metric' ? 100 : 12) - drops * plan.cutLengthBase;
    card.append(createElement('span', 'roll-remainder', remainder > 0 ? `${formatBaseLength(remainder, plan.system)} left` : 'fully used'));
    grid.append(card);
  }
  map.append(grid);
  if (plan.totalRolls > visibleRolls) map.append(createElement('p', 'map-more', `+ ${plan.totalRolls - visibleRolls} more rolls in the order.`));
}

function shoppingListText(plan) {
  const match = plan.match === 'random' ? 'random / no match' : plan.match === 'straight' ? 'straight match' : 'half-drop / offset';
  const priceLine = plan.pricePerRoll > 0 ? `Estimated material cost: ${formatMoney(plan.materialCost, appState.currency)} (${formatMoney(plan.pricePerRoll, appState.currency)} per roll)` : 'Price: not entered';
  return [
    'ROLLREADY WALLPAPER SHOPPING LIST',
    '',
    `Buy: ${plan.totalRolls} ${plan.totalRolls === 1 ? 'roll' : 'rolls'} (${plan.workingRolls} working + ${plan.spareRolls} spare${plan.spareRolls === 1 ? '' : 's'})`,
    `Drops: ${plan.dropsNeeded} full-width drops`,
    `Roll: ${formatBaseLength(plan.rollWidth * (plan.system === 'metric' ? 1 : 1), plan.system, 'width')} wide × ${formatBaseLength(plan.system === 'metric' ? plan.rollLength * 100 : plan.rollLength * 12, plan.system)} long`,
    `Match: ${match}; repeat ${formatBaseLength(plan.repeat, plan.system, 'repeat')}`,
    `Cut each drop: ${formatBaseLength(plan.cutLengthBase, plan.system)}`,
    priceLine,
    '',
    'Keep all rolls from the same dye lot. This is a planning estimate; check the manufacturer label and your decorator’s advice for murals, horizontal hanging or uneven walls.',
    '',
    'https://thisbejim.github.io/wallpaper-roll-planner/',
  ].join('\n');
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(successMessage);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    setStatus(copied ? successMessage : 'Copy was blocked. Select the result text manually.');
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus('Shopping list downloaded.');
}

function shareUrl() {
  const values = readInputs();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (key !== 'currency' && value !== undefined && value !== '') params.set(key, String(value));
  }
  params.set('s', appState.system);
  const url = `${window.location.origin}${window.location.pathname}#${params.toString()}`;
  window.history.replaceState(null, '', `#${params.toString()}`);
  return url;
}

function loadSharedState() {
  if (!window.location.hash.startsWith('#')) return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const system = params.get('s');
  if (system === 'imperial' || system === 'metric') appState.system = system;
  for (const [key, element] of Object.entries(inputs)) {
    if (key === 'currency') continue;
    const value = params.get(key);
    if (value !== null) element.value = value;
  }
  const currency = params.get('currency');
  if (currency && [...inputs.currency.options].some((option) => option.value === currency)) appState.currency = currency;
}

function resetExample() {
  appState.system = DEFAULTS.system;
  appState.currency = 'USD';
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (key === 'system' || key === 'currency') continue;
    if (inputs[key]) inputs[key].value = String(value);
  }
  inputs.match.value = DEFAULTS.match;
  inputs.currency.value = appState.currency;
  updateUnitLabels();
  window.history.replaceState(null, '', window.location.pathname);
  recalculate();
}

for (const input of Object.values(inputs)) input.addEventListener('input', recalculate);
for (const input of Object.values(inputs)) input.addEventListener('change', recalculate);
document.querySelectorAll('.unit-button').forEach((button) => button.addEventListener('click', () => switchSystem(button.dataset.system)));
document.querySelector('#reset-button').addEventListener('click', resetExample);
document.querySelector('#copy-button').addEventListener('click', () => appState.plan && copyText(shoppingListText(appState.plan), 'Shopping list copied.'));
document.querySelector('#download-button').addEventListener('click', () => appState.plan && downloadText('rollready-shopping-list.txt', shoppingListText(appState.plan)));
document.querySelector('#print-button').addEventListener('click', () => window.print());
document.querySelector('#share-button').addEventListener('click', () => appState.plan && copyText(shareUrl(), 'Shareable link copied.'));

loadSharedState();
inputs.currency.value = appState.currency;
updateUnitLabels();
recalculate();
