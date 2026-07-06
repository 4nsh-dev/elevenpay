import { formatUnits, parseUnits } from 'ethers';

import { env } from '@/lib/env';

export function usdtToBaseUnits(amount: string): bigint {
  return parseUnits(amount, env.EXPO_PUBLIC_USDT_DECIMALS);
}

export function baseUnitsToUsdt(amount: bigint): string {
  return formatUnits(amount, env.EXPO_PUBLIC_USDT_DECIMALS);
}

export function weiToEth(amount: bigint): string {
  return formatUnits(amount, 18);
}
