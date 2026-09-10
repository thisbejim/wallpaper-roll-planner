import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlan } from '../calc.js';

test('calculates the default plain-paper room transparently', () => {
  const plan = calculatePlan({
    wallRun: 48,
    wallHeight: 8,
    rollWidth: 20.5,
    rollLength: 33,
    repeat: 0,
    match: 'random',
    trim: 3,
    spareRolls: 1,
  });

  assert.equal(plan.dropsNeeded, 29);
  assert.equal(plan.dropsPerRoll, 4);
  assert.equal(plan.workingRolls, 8);
  assert.equal(plan.totalRolls, 9);
  assert.equal(plan.matchingAllowanceBase, 0);
});

test('pattern repeat rounds each drop before working out rolls', () => {
  const plan = calculatePlan({
    wallRun: 48,
    wallHeight: 8,
    rollWidth: 20.5,
    rollLength: 33,
    repeat: 20,
    match: 'straight',
    trim: 3,
    spareRolls: 0,
  });

  // 99 in trimmed drop rounds to 100 in; only 3 drops fit in a 396 in roll.
  assert.equal(plan.cutLengthBase, 100);
  assert.equal(plan.dropsPerRoll, 3);
  assert.equal(plan.workingRolls, 10);
});

test('full-height openings reduce drops, while ordinary openings can remain zero', () => {
  const withoutOpening = calculatePlan({ wallRun: 120, wallHeight: 2.4, system: 'metric', rollWidth: 53, rollLength: 10.05, trim: 8, spareRolls: 0 });
  const withOpening = calculatePlan({ wallRun: 120, wallHeight: 2.4, fullHeightOpenings: 0.53, system: 'metric', rollWidth: 53, rollLength: 10.05, trim: 8, spareRolls: 0 });

  assert.ok(withOpening.dropsNeeded < withoutOpening.dropsNeeded);
  assert.equal(withOpening.units.wall, 'm');
});

test('rejects impossible and ambiguous inputs with human-readable errors', () => {
  assert.throws(() => calculatePlan({ wallRun: 10, fullHeightOpenings: 11 }), /cannot be wider/);
  assert.throws(() => calculatePlan({ match: 'straight', repeat: 0 }), /pattern repeat/);
  assert.throws(() => calculatePlan({ rollLength: 1, wallHeight: 8, trim: 3, repeat: 20, match: 'straight' }), /too short/);
});

test('half-drop is conservative and never uses fewer drops than straight match', () => {
  const straight = calculatePlan({ wallRun: 48, wallHeight: 8, rollWidth: 20.5, rollLength: 33, repeat: 18, match: 'straight', trim: 3, spareRolls: 0 });
  const halfDrop = calculatePlan({ wallRun: 48, wallHeight: 8, rollWidth: 20.5, rollLength: 33, repeat: 18, match: 'half-drop', trim: 3, spareRolls: 0 });

  assert.ok(halfDrop.cutLengthBase >= straight.cutLengthBase);
  assert.ok(halfDrop.workingRolls >= straight.workingRolls);
});
