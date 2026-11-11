/**
 * Deterministic randomness for daily content.
 *
 * Everyone playing on the same day must get the same puzzle without a server,
 * so selection is a pure function of a string seed. `mulberry32` is small,
 * fast and well distributed for this purpose; it is not for anything secret.
 */

/** 32-bit FNV-1a hash of a string, as the seed for `mulberry32`. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A generator of floats in [0, 1) seeded from a string. */
export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The indices `0 … length-1` in a seeded Fisher–Yates order.
 *
 * Walking this permutation day by day is what keeps dailies from repeating:
 * day `d` takes slots `d*k … d*k+k-1`, so no index comes back until the whole
 * pool has been dealt once.
 */
export function seededPermutation(length: number, seed: string): number[] {
  const order = Array.from({ length }, (_, index) => index);
  const random = seededRandom(seed);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

/**
 * The `count` pool indices dealt on `dayIndex` from a seeded permutation.
 * Wraps around once the pool is exhausted rather than failing.
 */
export function dailySlice(
  poolSize: number,
  seed: string,
  dayIndex: number,
  count: number,
): number[] {
  if (poolSize <= 0 || count <= 0) return [];
  const order = seededPermutation(poolSize, seed);
  return Array.from(
    { length: Math.min(count, poolSize) },
    (_, offset) => order[(dayIndex * count + offset) % poolSize],
  );
}
