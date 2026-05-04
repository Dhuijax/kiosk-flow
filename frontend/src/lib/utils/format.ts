import { Money } from "@/gen/common_pb";

/**
 * Converts a common.Money object to a numeric value
 */
export function moneyToNumber(money: Money | undefined): number {
  if (!money) return 0;
  const units = Number(money.units);
  const nanos = money.nanos / 1_000_000_000;
  return units + nanos;
}

/**
 * Formats a common.Money object or number as VND
 */
export function formatVND(value: Money | number | undefined): string {
  const amount = typeof value === 'number' ? value : moneyToNumber(value);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
