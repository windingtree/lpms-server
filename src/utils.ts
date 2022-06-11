import { Timestamp } from './proto/timestamp';

export function convertDaysToSeconds(days: number) {
  return days * 60 * 60 * 24;
}
//todo relocate to videre-sdk
export function getCurrentTimestamp(): Timestamp {
  //todo replace to vedere sdk
  const timeMS = Date.now();

  return {
    seconds: BigInt(Math.floor(timeMS / 1000)),
    nanos: (timeMS % 1000) * 1e6
  };
}
