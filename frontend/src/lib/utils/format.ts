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
  // Manual formatting to ensure hydration stability across different environments
  const formatted = Math.floor(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted} ₫`;
}

/**
 * Formats a date as a human-readable string (DD/MM HH:mm)
 */
export function formatDateTime(date: Date | string | number | undefined): string {
  if (!date) return '...';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '...';
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${day}/${month} ${hours}:${minutes}`;
}
