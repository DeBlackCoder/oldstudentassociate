import test from 'node:test';
import assert from 'node:assert/strict';
import { nigerianLGAsByState, nigerianStates, riversStateLGAs } from '../lib/utils/nigeria-data';

const expectedLgaCounts: Record<string, number> = {
  Abia: 17,
  Adamawa: 21,
  'Akwa Ibom': 31,
  Anambra: 21,
  Bauchi: 20,
  Bayelsa: 8,
  Benue: 23,
  Borno: 27,
  'Cross River': 18,
  Delta: 25,
  Ebonyi: 13,
  Edo: 18,
  Ekiti: 16,
  Enugu: 17,
  FCT: 6,
  Gombe: 11,
  Imo: 27,
  Jigawa: 27,
  Kaduna: 23,
  Kano: 44,
  Katsina: 34,
  Kebbi: 21,
  Kogi: 21,
  Kwara: 16,
  Lagos: 20,
  Nasarawa: 13,
  Niger: 25,
  Ogun: 20,
  Ondo: 18,
  Osun: 30,
  Oyo: 33,
  Plateau: 17,
  Rivers: 23,
  Sokoto: 23,
  Taraba: 16,
  Yobe: 17,
  Zamfara: 14,
};

test('provides all Nigerian states and their complete LGA lists', () => {
  assert.deepEqual(Object.keys(nigerianLGAsByState).sort(), [...nigerianStates].sort());

  for (const [state, expectedCount] of Object.entries(expectedLgaCounts)) {
    const lgas = nigerianLGAsByState[state];
    assert.equal(lgas.length, expectedCount, `${state} LGA count`);
    assert.ok(lgas.every((lga) => lga.trim().length > 0), `${state} contains a non-empty LGA`);
    assert.equal(new Set(lgas).size, lgas.length, `${state} contains no duplicate LGAs`);
  }

  assert.equal(Object.values(nigerianLGAsByState).reduce((total, lgas) => total + lgas.length, 0), 774);
  assert.deepEqual(riversStateLGAs, nigerianLGAsByState.Rivers);
});
