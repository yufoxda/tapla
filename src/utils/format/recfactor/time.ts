
/**
 * 時刻文字列を分に変換するヘルパー関数
 * @param timeString - 時刻文字列（"HH:MM"形式）
 * @returns 分に変換された数値
 */
export function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 分を時刻文字列に変換するヘルパー関数
 * @param minutes - 分数
 * @returns "HH:MM"形式の時刻文字列
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
