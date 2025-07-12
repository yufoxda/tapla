export interface TimeRange {
  start: number;
  end: number;
}

export interface ParsedDate {
  date: Date | null;
  isDateRecognized: boolean;
}

export interface ParsedTime {
  startTime: string | null;
  endTime: string | null;
  isTimeRecognized: boolean;
}

/** * 日付ラベルを解析する関数
 * @param dateLabel - 日付ラベル文字列
 * @returns { date: dateオブジェクト, isDateRecognized: マッチするかboolean };
 * @description
 * 日付ラベルは様々な形式（YYYY-MM-DD、YYYY/MM/DD、YYYY年MM月DD日、MM-DD、MM/DD、MM月DD日）に対応。
 * 年がない場合は現在の年を使用。
 * 解析できない場合はnullを返す。
 */
export function parseDateLabel(dateLabel: string): ParsedDate {
  if (!dateLabel) {
    return { date: null, isDateRecognized: false };
  }
  
  const regex = /(?:(\d{4})[-\/年])?(\d{1,2})[-\/月](\d{1,2})日?/;// 年付き・年なし
  const match = dateLabel.match(regex);

// match[0] = "2024年12月25日"  // マッチした全体
// match[1] = "2024"            // 年の部分
// match[2] = "12"              // 月の部分
// match[3] = "25"   
  
  if (match) {
    const currentYear = new Date().getFullYear();
    const year = match[1] ? parseInt(match[1]) : currentYear;  // 年がない場合は現在の年
    const month = parseInt(match[2]) - 1;  // Dateオブジェクトでは月は0から始まる
    const day = parseInt(match[3]);
    
    const date = new Date(year, month, day);
    return { date, isDateRecognized: true };
  }
  
  return { date: null, isDateRecognized: false };
}

/** * 時刻ラベルを解析する関数
 * @param timeLabel - 時刻ラベル文字列
 * @returns { startTime: null, endTime: null, isTimeRecognized: false };
 * @description
 * 時刻ラベルは様々な形式（HH:MM、HH:MM-HH:MM、HH:MM~HH:MM）に対応。
 * 時刻範囲の場合は開始時刻と終了時刻を返す。
 * 単一時刻の場合は開始時刻のみを返し、終了時刻はnull。
 * 解析できない場合はnullを返す。
 */
export function parseTimeLabel(timeLabel: string): ParsedTime {
  if (!timeLabel) {
    return { startTime: null, endTime: null, isTimeRecognized: false };
  }
  
  // 時刻範囲のパターン: "09:00-17:00", "9:00~17:00", "09:00 - 17:00"
  const rangePattern = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\s*[-~]\s*(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
  const rangeMatch = timeLabel.match(rangePattern);
  
  if (rangeMatch) {
    const startTime = `${rangeMatch[1].padStart(2, '0')}:${rangeMatch[2]}`;
    const endTime = `${rangeMatch[3].padStart(2, '0')}:${rangeMatch[4]}`;
    return { startTime, endTime, isTimeRecognized: true };
  }
  
  // 単一時刻のパターン: "09:00", "9:00"
  const singlePattern = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
  const singleMatch = timeLabel.match(singlePattern);
  
  if (singleMatch) {
    const startTime = `${singleMatch[1].padStart(2, '0')}:${singleMatch[2]}`;
    return { startTime, endTime: null, isTimeRecognized: true };
  }
  
  return { startTime: null, endTime: null, isTimeRecognized: false };
}


/**
 * 時刻文字列を分に変換するヘルパー関数
 * @param timeString - 時刻文字列（"HH:MM"形式）
 * @returns 分に変換された数値
 */
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 分を時刻文字列に変換するヘルパー関数
 * @param minutes - 分数
 * @returns "HH:MM"形式の時刻文字列
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 時間間隔を推測する関数
 * @param timeLabels - 時刻ラベルの配列（オプション）
 * @param defaultInterval - デフォルトの間隔（分単位、デフォルト: 60分）
 * @returns 推測された間隔（分単位）
 */
export function estimateTimeInterval(timeLabels?: string[], defaultInterval: number = 60): number {
  if (!timeLabels || timeLabels.length < 2) {
    return defaultInterval;
  }
  
  const intervals: number[] = [];
  
  for (let i = 0; i < timeLabels.length - 1; i++) {
    const currentLabel = parseTimeLabel(timeLabels[i]);
    const nextLabel = parseTimeLabel(timeLabels[i + 1]);
    
    if (currentLabel.isTimeRecognized && nextLabel.isTimeRecognized && 
        currentLabel.startTime && nextLabel.startTime) {
      const currentMinutes = timeStringToMinutes(currentLabel.startTime);
      const nextMinutes = timeStringToMinutes(nextLabel.startTime);
      const interval = nextMinutes - currentMinutes;
      
      if (interval > 0 && interval <= 480) { // 最大8時間までの間隔を有効とする
        intervals.push(interval);
      }
    }
  }
  
  if (intervals.length === 0) {
    return defaultInterval;
  }
  
  // 最も頻出する間隔を返す
  const intervalCounts = intervals.reduce((acc, interval) => {
    acc[interval] = (acc[interval] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const mostCommonInterval = Object.entries(intervalCounts)
    .sort(([,a], [,b]) => b - a)[0][0];
  
  return parseInt(mostCommonInterval);
}

/**
 * 単一時刻にendTimeを計算して追加する関数
 * @param startTime - 開始時刻（"HH:MM"形式）
 * @param interval - 間隔（分単位、デフォルト: 60分）
 * @returns 終了時刻（"HH:MM"形式）
 */
export function calculateEndTime(startTime: string, interval: number = 60): string {
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = startMinutes + interval;
  
  // 24時間を超える場合は23:59に制限
  const limitedEndMinutes = Math.min(endMinutes, 23 * 60 + 59);
  
  return minutesToTimeString(limitedEndMinutes);
}


/**
 * ParsedTimeの配列から時間間隔を推測する関数
 * @param parsedTimes - ParsedTimeの配列
 * @param defaultInterval - デフォルトの間隔（分単位、デフォルト: 60分）
 * @returns 推測された間隔（分単位）
 */
function estimateTimeIntervalFromParsedTimes(parsedTimes: ParsedTime[], defaultInterval: number = 60): number {
  if (parsedTimes.length < 2) {
    return defaultInterval;
  }
  
  // endTimeがnullの要素（単一時刻）のみを対象に間隔を推測
  const singleTimeParsedTimes = parsedTimes.filter(pt => 
    pt.isTimeRecognized && pt.startTime && !pt.endTime
  );
  
  if (singleTimeParsedTimes.length < 2) {
    return defaultInterval;
  }
  
  const intervals: number[] = [];
  
  for (let i = 0; i < singleTimeParsedTimes.length - 1; i++) {
    const current = singleTimeParsedTimes[i];
    const next = singleTimeParsedTimes[i + 1];
    
    if (current.startTime && next.startTime) {
      const currentMinutes = timeStringToMinutes(current.startTime);
      const nextMinutes = timeStringToMinutes(next.startTime);
      const interval = nextMinutes - currentMinutes;
      
      if (interval > 0 && interval <= 480) { // 最大8時間までの間隔を有効とする
        intervals.push(interval);
      }
    }
  }
  
  if (intervals.length === 0) {
    return defaultInterval;
  }
  
  // 最も頻出する間隔を返す
  const intervalCounts = intervals.reduce((acc, interval) => {
    acc[interval] = (acc[interval] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const mostCommonInterval = Object.entries(intervalCounts)
    .sort(([,a], [,b]) => b - a)[0][0];
  
  return parseInt(mostCommonInterval);
}

/**
 * ParsedTimeの配列を受け取り、単一時刻にendTimeを設定した配列を返す関数
 * @param parsedTimes - ParsedTimeの配列（単一時刻の場合endTimeはnull）
 * @param defaultInterval - デフォルトの間隔（分単位、デフォルト: 60分）
 * @returns endTimeが設定されたParsedTimeの配列
 */
export function addEndTimesToParsedTimes(
  parsedTimes: ParsedTime[], 
  defaultInterval: number = 60
): ParsedTime[] {
  if (parsedTimes.length === 0) {
    return [];
  }
  
  // 間隔を推測
  const estimatedInterval = estimateTimeIntervalFromParsedTimes(parsedTimes, defaultInterval);
  
  // 各要素を処理
  return parsedTimes.map(parsedTime => {
    // 既にendTimeがある場合はそのまま返す
    if (parsedTime.endTime) {
      return { ...parsedTime };
    }
    
    // 単一時刻の場合にendTimeを計算
    if (parsedTime.isTimeRecognized && parsedTime.startTime) {
      const endTime = calculateEndTime(parsedTime.startTime, estimatedInterval);
      return {
        ...parsedTime,
        endTime
      };
    }
    
    // 認識されていない時刻の場合はそのまま返す
    return { ...parsedTime };
  });
}
