
/**
 * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列にフォーマットする
 * @param date - フォーマットするDateオブジェクト
 * @returns 'YYYY-MM-DD' 形式の文字列
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  return `${year}-${formatNoyearDate(date)}`;
}

export function formatNoyearDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}


/**
 * date配列を作成する
 * @param date_start - 開始日
 * @param date_end - 終了日
 * @returns 最後が空の要素のdate配列
 * 例: ['10-01', '10-02', ...,'']
 */
export function createDateArray(date_start: Date, date_end: Date): string[] {
  const startDate = new Date(date_start);
  const endDate = new Date(date_end);
  
  // 日数差を計算
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // 無効な日付範囲の場合は空配列に空文字を追加して返す
  if (daysDiff < 1) return [''];
  
  // 日付配列を生成
  const dates = Array.from({ length: daysDiff }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return formatNoyearDate(date);
  });
  
  // 最後に空の要素を追加
  dates.push('');
  return dates;
}

/** * 
 * @param startTime 
 * @param endTime
 * @returns 最後が空の要素の時間配列
 * 例: ['09:00', '10:00', ...,'']
 */
export function createTimeArray(startTotalMinutes: number, endTotalMinutes: number): string[] {
        
    const hoursDiff = Math.floor((endTotalMinutes - startTotalMinutes) / 60) + 1;
    const times = Array.from({ length: hoursDiff }, (_, i) => {
      const totalMinutes = startTotalMinutes + (i * 60);
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });
    // 最後に空の要素を追加
    times.push('');
    return times;
}