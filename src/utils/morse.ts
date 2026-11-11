/**
 * Утилиты для работы с тактическим шифром Морзе
 * Единый стандарт приватности Prime Suspect
 */

export function normalizeMorse(input: string): string {
  if (!input) return "";
  return input
    .replace(/[•\.]/g, ".")
    .replace(/[—–\-]/g, "-")
    .replace(/[^.\-]/g, "");
}
