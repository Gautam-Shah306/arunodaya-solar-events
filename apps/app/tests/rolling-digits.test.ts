import { describe, expect, it } from 'vitest';
import { countdownParts, planSlots, rollDirection } from '../src/ui/rolling-digits-model.js';

describe('Rolling Digits Model', () => {
  it('roll direction is down on decrease, up on increase, null on equal', () => {
    expect(rollDirection(60, 59)).toBe('down');
    expect(rollDirection(10, 5)).toBe('down');
    expect(rollDirection(59, 60)).toBe('up');
    expect(rollDirection(5, 10)).toBe('up');
    expect(rollDirection(60, 60)).toBeNull();
    expect(rollDirection(null, 60)).toBeNull();
  });

  it('planSlots marks only changing digit characters for animation', () => {
    const slots = planSlots('02h 48m', '02h 47m', 'down');
    expect(slots.length).toBe(7);

    // '0', '2', 'h', ' ', '4' should not animate
    expect(slots[0]?.animate).toBe(false);
    expect(slots[1]?.animate).toBe(false);
    expect(slots[2]?.animate).toBe(false);
    expect(slots[3]?.animate).toBe(false);
    expect(slots[4]?.animate).toBe(false);

    // '8' -> '7' should animate
    expect(slots[5]?.animate).toBe(true);
    expect(slots[5]?.char).toBe('7');
    expect(slots[5]?.previousChar).toBe('8');
    expect(slots[5]?.direction).toBe('down');

    // 'm' should not animate
    expect(slots[6]?.animate).toBe(false);
  });

  it('planSlots keeps separators and unit letters static', () => {
    // Large change where digits and letters could shift
    const slots = planSlots('01h 00m', '00h 59m', 'down');
    expect(slots.length).toBe(7);

    // Separators 'h', ' ', 'm' at indices 2, 3, 6
    const hSlot = slots[2];
    const spaceSlot = slots[3];
    const mSlot = slots[6];

    expect(hSlot?.isDigit).toBe(false);
    expect(hSlot?.animate).toBe(false);
    expect(hSlot?.char).toBe('h');

    expect(spaceSlot?.isDigit).toBe(false);
    expect(spaceSlot?.animate).toBe(false);
    expect(spaceSlot?.char).toBe(' ');

    expect(mSlot?.isDigit).toBe(false);
    expect(mSlot?.animate).toBe(false);
    expect(mSlot?.char).toBe('m');
  });

  it('countdown formatting splits hours and minutes with fixed slot count', () => {
    const part1 = countdownParts(168); // 2 hours 48 minutes
    expect(part1.hours).toBe(2);
    expect(part1.minutes).toBe(48);
    expect(part1.text).toBe('02h 48m');
    expect(part1.text.length).toBe(7);

    const part2 = countdownParts(1); // 0 hours 1 minute
    expect(part2.hours).toBe(0);
    expect(part2.minutes).toBe(1);
    expect(part2.text).toBe('00h 01m');
    expect(part2.text.length).toBe(7);

    const partZero = countdownParts(0);
    expect(partZero.hours).toBe(0);
    expect(partZero.minutes).toBe(0);
    expect(partZero.text).toBe('00h 00m');
    expect(partZero.text.length).toBe(7);

    const partNegative = countdownParts(-5);
    expect(partNegative.hours).toBe(0);
    expect(partNegative.minutes).toBe(0);
    expect(partNegative.text).toBe('00h 00m');
  });
});
