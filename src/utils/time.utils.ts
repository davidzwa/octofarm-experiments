export async function sleep(ms = 2000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidDate(date: Date | number) {
  return date instanceof Date && !isNaN(date);
}
