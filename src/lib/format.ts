/**
 * Display formatting. Amounts travel as strings end-to-end (see docs/api-contracts.md);
 * these helpers are for rendering only — never arithmetic.
 */

export function formatUsdt(amount: string | number): string {
  const n = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
