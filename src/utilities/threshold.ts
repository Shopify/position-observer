/**
 * The threshold for the intersection ratio.
 *
 * @returns The threshold for the intersection ratio.
 * @example [0, 0.001, 0.002, ... , 0.998, 0.999, 1]
 */
export const threshold = [
  ...Array.from({ length: 1000 }, (_, i) => i / 1000),
  1,
];
