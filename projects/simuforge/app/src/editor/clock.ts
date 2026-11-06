export type Clock = () => string;

export function createClock(clock?: Clock): Clock {
  if (clock) {
    return clock;
  }
  return () => new Date().toISOString();
}
