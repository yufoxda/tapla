import { TimeRange } from "./labelParser";
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
 * @returns { date: date, isDateRecognized: マッチするかboolean };
 * @description
 * 日付ラベルは様々な形式（YYYY-MM-DD、YYYY/MM/DD、YYYY年MM月DD日、MM-DD、MM/DD、MM月DD日）に対応。
 * 年がない場合は現在の年を使用。
 * 解析できない場合はnullを返す。
 */
export function parseDateLabel(dateLabel: string): ParsedDate {
  if (!dateLabel) {
    return { date: null, isDateRecognized: false };
  }
  
  const regex = /(?:(\d{4})[-\/年])?(\d{1,2})[-\/月]?(\d{1,2})日?/;// 年付き・年なし
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


