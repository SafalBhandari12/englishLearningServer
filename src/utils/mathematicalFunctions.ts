export function stretchLowEnd(x: number, power = 1.5): number {
  const normalized = Math.max(0, Math.min(1, x / 100)); // Normalize to [0,1]
  return Math.pow(normalized, power) * 100; // Apply power and scale back
}
