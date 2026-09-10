const EPSILON = 1e-9;

export const UNIT_SYSTEMS = {
  imperial: {
    wall: 'ft',
    height: 'ft',
    rollWidth: 'in',
    rollLength: 'ft',
    repeat: 'in',
    trim: 'in',
  },
  metric: {
    wall: 'm',
    height: 'm',
    rollWidth: 'cm',
    rollLength: 'm',
    repeat: 'cm',
    trim: 'cm',
  },
};

export const DEFAULTS = {
  system: 'imperial',
  wallRun: 48,
  wallHeight: 8,
  fullHeightOpenings: 0,
  rollWidth: 20.5,
  rollLength: 33,
  repeat: 0,
  match: 'random',
  trim: 3,
  spareRolls: 1,
  pricePerRoll: 0,
};

function finitePositive(value, label, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(`${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'}.`);
  }
  return number;
}

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
    throw new Error(`${label} must be a whole number of zero or more.`);
  }
  return number;
}

/**
 * Calculate a wallpaper order using the drop-and-roll method.
 * All lengths must be supplied in one consistent unit system; roll width,
 * repeat and trim are converted to the same base unit before calculation.
 */
export function calculatePlan(input = {}) {
  const system = input.system === 'metric' ? 'metric' : 'imperial';
  const wallRun = finitePositive(input.wallRun ?? DEFAULTS.wallRun, 'Total wall run');
  const wallHeight = finitePositive(input.wallHeight ?? DEFAULTS.wallHeight, 'Wall height');
  const fullHeightOpenings = finitePositive(
    input.fullHeightOpenings ?? DEFAULTS.fullHeightOpenings,
    'Full-height opening width',
    { allowZero: true },
  );
  const rollWidth = finitePositive(input.rollWidth ?? DEFAULTS.rollWidth, 'Roll width');
  const rollLength = finitePositive(input.rollLength ?? DEFAULTS.rollLength, 'Roll length');
  const repeat = finitePositive(input.repeat ?? DEFAULTS.repeat, 'Pattern repeat', { allowZero: true });
  const trim = finitePositive(input.trim ?? DEFAULTS.trim, 'Trim allowance', { allowZero: true });
  const spareRolls = nonNegativeInteger(input.spareRolls ?? DEFAULTS.spareRolls, 'Spare rolls');
  const pricePerRoll = finitePositive(input.pricePerRoll ?? DEFAULTS.pricePerRoll, 'Price per roll', { allowZero: true });
  const match = ['random', 'straight', 'half-drop'].includes(input.match) ? input.match : DEFAULTS.match;

  if (fullHeightOpenings - wallRun > EPSILON) {
    throw new Error('Full-height openings cannot be wider than the total wall run.');
  }
  if ((match !== 'random' || repeat > 0) && repeat <= 0) {
    throw new Error('Enter a pattern repeat for a matched pattern.');
  }

  // Convert the entered units to the natural base unit for each system so
  // the result stays exact without relying on formatted display strings.
  const toBase = system === 'metric'
    ? {
        wall: wallRun * 100,
        height: wallHeight * 100,
        opening: fullHeightOpenings * 100,
        rollWidth: rollWidth,
        rollLength: rollLength * 100,
        repeat: repeat,
        trim: trim,
      }
    : {
        wall: wallRun * 12,
        height: wallHeight * 12,
        opening: fullHeightOpenings * 12,
        rollWidth: rollWidth,
        rollLength: rollLength * 12,
        repeat: repeat,
        trim: trim,
      };

  const paperRun = toBase.wall - toBase.opening;
  const dropsNeeded = Math.max(1, Math.ceil(paperRun / toBase.rollWidth - EPSILON));
  const rawDropLength = toBase.height + toBase.trim;
  let cutLength = rawDropLength;
  let matchingAllowance = 0;

  if (match === 'straight') {
    cutLength = Math.ceil(rawDropLength / toBase.repeat - EPSILON) * toBase.repeat;
    matchingAllowance = cutLength - rawDropLength;
  } else if (match === 'half-drop') {
    const offsetLength = rawDropLength + toBase.repeat / 2;
    cutLength = Math.ceil(offsetLength / toBase.repeat - EPSILON) * toBase.repeat;
    matchingAllowance = cutLength - rawDropLength;
  }

  const dropsPerRoll = Math.floor(toBase.rollLength / cutLength + EPSILON);
  if (dropsPerRoll < 1) {
    throw new Error('This roll is too short for one trimmed drop. Try a longer roll or a shorter wall.');
  }

  const workingRolls = Math.ceil(dropsNeeded / dropsPerRoll);
  const totalRolls = workingRolls + spareRolls;
  const purchasedLength = totalRolls * toBase.rollLength;
  const usedLength = dropsNeeded * cutLength;
  const wasteLength = Math.max(0, purchasedLength - usedLength);
  const wastePercent = purchasedLength > 0 ? (wasteLength / purchasedLength) * 100 : 0;
  const materialCost = totalRolls * pricePerRoll;

  return {
    system,
    match,
    wallRun,
    wallHeight,
    fullHeightOpenings,
    rollWidth,
    rollLength,
    repeat,
    trim,
    spareRolls,
    pricePerRoll,
    paperRunBase: paperRun,
    rollWidthBase: toBase.rollWidth,
    dropsNeeded,
    rawDropLengthBase: rawDropLength,
    cutLengthBase: cutLength,
    matchingAllowanceBase: matchingAllowance,
    dropsPerRoll,
    workingRolls,
    totalRolls,
    purchasedLengthBase: purchasedLength,
    usedLengthBase: usedLength,
    wasteLengthBase: wasteLength,
    wastePercent,
    materialCost,
    units: UNIT_SYSTEMS[system],
  };
}

export function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

export function formatMoney(value, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function displayBaseLength(value, system, kind) {
  if (system === 'metric') {
    if (kind === 'width') return { value, unit: 'cm' };
    return value >= 100 ? { value: value / 100, unit: 'm' } : { value, unit: 'cm' };
  }
  if (kind === 'width' || kind === 'repeat' || kind === 'trim') return { value, unit: 'in' };
  return value >= 12 ? { value: value / 12, unit: 'ft' } : { value, unit: 'in' };
}
