import { parseTimeLabel } from './judgeLabel';
import { timeStringToMinutes, minutesToTimeString } from './time';
import { type ParsedTime } from './judgeLabel';
export interface TimeRange{
    start: string;  
    end: string;
    is_recognized: boolean;
}

/**
 * ラベルデータを処理してstart-end形式に変換する関数
 * @param timeLabels - 元のラベルデータ
 * @returns 処理済みのラベルデータ{ start: string, end: string, is_recognized: boolean }[]
 * @description
 * 時刻ラベルを解析し、start-end形式に変換します。
 * 各ラベルは、開始時刻と終了時刻を持つオブジェクトに変換されます。
 * 認識できないラベルも含まれますが、is_recognizedフラグで判別できます。
 * 想定しているパターンはparseTimeLabelで定義されています。
 */
export function createTimeRangeFromLabels(
    timeLabels: string[],
): TimeRange[] {
    const timeRanges: TimeRange[] = [];

    for (const label of timeLabels) {
        const TimeRangeLabel = parseTimeLabel(label);

        timeRanges.push(
            {
                start: TimeRangeLabel.startTime || '',
                end: TimeRangeLabel.endTime || '',
                is_recognized: TimeRangeLabel.isTimeRecognized
            }
        );
    }

    const TimeRangeLabelsWithEndTimes = addEndTimesToParsedTimes(timeRanges);
    
    return TimeRangeLabelsWithEndTimes;
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



/** 時間配列から時間間隔を推定する関数
 * @param timeRanges - 時刻ラベルの配列{ startTime: string, endTime: string,is_available: boolean }[]
 * @returns 時間間隔（分単位）
 */
function estimateTimeIntervalFromTimes(parsedTimes: TimeRange[], defaultInterval: number = 60): number {
  if (parsedTimes.length < 2) {
    return defaultInterval;
  }
  
  const intervals: number[] = [];
  
  for (let i = 0; i < parsedTimes.length - 1; i++) {
    const current = parsedTimes[i];
    const next = parsedTimes[i + 1];
    
    if (current.start && next.start) {
      const currentMinutes = timeStringToMinutes(current.start);
      const nextMinutes = timeStringToMinutes(next.start);
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
  parsedTimes: TimeRange[],
  defaultInterval: number = 60
): TimeRange[] {
  if (parsedTimes.length === 0) {
    return [];
  }
  
  // 間隔を推測
  const estimatedInterval = estimateTimeIntervalFromTimes(parsedTimes, defaultInterval);
  
  // 各要素を処理
  return parsedTimes.map(parsedTime => {
    // 認識されていない時刻の場合はそのまま返す
    if (parsedTime.is_recognized === false) {
      return { ...parsedTime };
    }
    
    // 既にendTimeがある場合はそのまま返す
    if (parsedTime.end && parsedTime.end !== '') {
      return { ...parsedTime };
    }
    
    const endTime = calculateEndTime(parsedTime.start ?? '', estimatedInterval);
    return {
      ...parsedTime,
      end: endTime
    };
  });
}
