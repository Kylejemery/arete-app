// Roman numerals for session numbering.
//
// The Academy numbers seminar sessions in roman throughout — the sidebar, the
// session header, the advisor's "Begin Session VII". This was a twelve-entry
// lookup table, duplicated in the course page and the advisor panel, which
// silently fell back to arabic past XII: PHIL 701's sessions 13 and 14 showed
// as "13" and "14" beside eleven roman numerals. PHIL 705 is written for
// twenty sessions, so the table would have run out again.

const NUMERALS: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/**
 * 1 → "I", 14 → "XIV", 20 → "XX". Anything that is not a positive whole
 * number is returned as digits, which keeps the old defensive behaviour: a
 * session id that is somehow 0 or fractional renders as itself rather than
 * as an empty string.
 */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1) return String(n);
  let rest = n;
  let out = '';
  for (const [value, symbol] of NUMERALS) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}
