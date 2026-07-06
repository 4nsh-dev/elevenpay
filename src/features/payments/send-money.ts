import { z } from 'zod';

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const EVM_ADDRESS_SEARCH_PATTERN = /0x[a-fA-F0-9]{40}/;
const USDT_AMOUNT_PATTERN = /^\d+(\.\d{1,6})?$/;

function isPositiveUsdtAmount(amount: string) {
  if (!USDT_AMOUNT_PATTERN.test(amount)) return false;

  const parts = amount.split('.');
  const whole = parts[0] ?? '0';
  const fraction = parts[1] ?? '';
  const baseUnits = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  return baseUnits > 0n;
}

export const sendMoneySchema = z.object({
  to: z.string().trim().regex(EVM_ADDRESS_PATTERN, 'Enter a valid EVM address.'),
  amount: z
    .string()
    .trim()
    .regex(USDT_AMOUNT_PATTERN, 'Enter a USDT amount with up to 6 decimals.')
    .refine(isPositiveUsdtAmount, 'Amount must be greater than zero.'),
  memo: z.string().trim().max(140, 'Memo is too long.').optional(),
});

export type SendMoneyFormValues = z.infer<typeof sendMoneySchema>;

export function extractRecipientAddressFromQr(payload: string) {
  const trimmed = payload.trim();

  if (EVM_ADDRESS_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const queryAddress =
      parsed.searchParams.get('address') ??
      parsed.searchParams.get('recipient') ??
      parsed.searchParams.get('to');

    if (queryAddress && EVM_ADDRESS_PATTERN.test(queryAddress)) {
      return queryAddress;
    }
  } catch {
    // Non-URL wallet QRs are common; fall through to the address scan below.
  }

  return trimmed.match(EVM_ADDRESS_SEARCH_PATTERN)?.[0] ?? null;
}
