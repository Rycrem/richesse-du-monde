export const TILE_W = 128;
export const TILE_H = 64;
export const SIDE = 10;

// Cell index -> grid coordinates on the perimeter of an 11 x 11 grid
export function cellGrid(i: number): [number, number] {
  if (i <= 10) return [SIDE - i, SIDE];
  if (i <= 20) return [0, SIDE - (i - 10)];
  if (i <= 30) return [i - 20, 0];
  return [SIDE, i - 30];
}

export function toScreen(gx: number, gy: number): [number, number] {
  return [((gx - gy) * TILE_W) / 2, ((gx + gy) * TILE_H) / 2];
}
