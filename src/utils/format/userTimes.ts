/** * Dateオブジェクトを標準化された日付文字列（YYYY-MM-DD）に変換する
 * @param date - Dateオブジェクト
 * @returns "YYYY-MM-DD"形式の日付文字列
 */
export function formatDateToStandard(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


/** * ユーザーの可用性パターンを学習するための型定義 */
export interface VoteData {
  eventDateId: string;
  eventTimeId: string;
  isAvailable: boolean;
}

/** * 日付と時刻の情報を含む投票用データ構造 */
export interface VoteItem {
  did: string;      // date ID
  dlabel: string;   // date label ("2023-10-01")
  tid: string;      // time ID  
  tlabel: string;   // time label ("09:00-10:00")
  isvoted: boolean; // 投票されているか
}

export interface UserAvailabilityPattern {
  id?: string;
  user_id: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

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

/** * 時刻文字列を分に変換するヘルパー関数
 * @param timeString - 時刻文字列（"HH:MM:SS"、"YYYY-MM-DD HH:MM:SS"、"YYYY-MM-DDTHH:MM:SS"形式）
 * @returns 分に変換された数値
 */
export function timeStringToMinutes(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') {
    console.warn('Invalid timeString:', timeString);
    return 0;
  }
  
  let timePart: string;
  if (timeString.includes('T')) {
    // ISO形式の場合: "2024-12-25T09:00:00"
    timePart = timeString.split('T')[1].split('.')[0];
  } else if (timeString.includes(' ')) {
    // スペース区切りの場合: "2024-12-25 09:00:00"
    timePart = timeString.split(' ')[1];
  } else {
    // 時刻のみの場合: "09:00:00"
    timePart = timeString;
  }
  
  if (!timePart) {
    console.warn('Could not extract time part from:', timeString);
    return 0;
  }
  
  const [hours, minutes] = timePart.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn('Invalid time format:', timePart);
    return 0;
  }
  
  // 時刻の有効性チェック（0-23時、0-59分）
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn('Time out of range:', timePart);
    return 0;
  }
  
  return hours * 60 + minutes;
}

/** * 分を時刻文字列に変換するヘルパー関数
 * @param minutes - 分数
 * @param dateString - 日付文字列（"YYYY-MM-DD"形式）
 * @returns "YYYY-MM-DD HH:MM:SS"形式の時刻文字列
 */
export function minutesToTimeString(minutes: number, dateString: string): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${dateString} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
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

/** * 時間範囲を結合する関数
 * @param {TimeRange[]} ranges - 時間範囲の配列
 * @returns {TimeRange[]} 結合された時間範囲の配列
 * @description
 * 時間範囲を開始時刻でソートし、隣接または重複している範囲を統合します。 日付ごとにグループ化された時間範囲配列なのでok
 * 隙間がある場合は新しい範囲として分割します。
 * 結合された時間範囲の配列を返します。
 */
export function mergeTimeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  
  // 開始時刻でソート
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  
  // reduceを使った関数型アプローチ
  return sortedRanges.reduce<TimeRange[]>((merged, current) => {
    if (merged.length === 0) {
      // 最初の要素
      return [current];
    }
    
    const last = merged[merged.length - 1];
    
    // 隣接または重複している場合は統合
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
      return merged;
    } else {
      // 隙間がある場合は新しい範囲として追加
      return [...merged, current];
    }
  }, []);
}

/** * VoteItem配列からユーザーの可用性パターンを作成する
 * @param voteItems - 投票アイテムの配列
 * @param userId - ユーザーID
 * @returns 作成されたユーザー可用性パターンの配列
 */
export function createUserAvailabilityPatternsFromVoteItems(
  voteItems: VoteItem[],
  userId: string
): UserAvailabilityPattern[] {
  // 投票された（利用可能な）アイテムのみをフィルタリング
  const availableVotes = voteItems.filter(item => item.isvoted);
  
  // 日付ごとにグループ化
  const votesByDate = new Map<string, VoteItem[]>();
  
  for (const vote of availableVotes) {
    // 日付ラベルを解析
    const parsedDate = parseDateLabel(vote.dlabel);
    if (!parsedDate.isDateRecognized || !parsedDate.date) continue;
    
    // 標準化された日付文字列を作成
    const normalizedDate = formatDateToStandard(parsedDate.date);
    
    // 日付ごとに投票をグループ化
    if (!votesByDate.has(normalizedDate)) {
      votesByDate.set(normalizedDate, []);
    }
    votesByDate.get(normalizedDate)!.push(vote);
  }
  
  const patterns: UserAvailabilityPattern[] = [];
  
  // 日付ごとに処理
  for (const [dateString, dayVotes] of votesByDate) {
    // 時刻情報を取得して分に変換
    const timeRanges = createTimeRangesFromVoteItems(dayVotes);
    
    // 時間範囲を結合
    const mergedRanges = mergeTimeRanges(timeRanges);
    
    // 結合された範囲をUserAvailabilityPatternに変換
    for (const range of mergedRanges) {
      const startTimestamp = minutesToTimeString(range.start, dateString);
      const endTimestamp = minutesToTimeString(range.end, dateString);
      
      patterns.push({
        user_id: userId,
        start_time: startTimestamp,
        end_time: endTimestamp
      });
    }
  }
  
  return patterns;
}

/** * VoteItemから時間範囲配列を作成する
 * @param dayVotes - その日の投票データ配列
 * @returns 時間範囲の配列
 */
export function createTimeRangesFromVoteItems(dayVotes: VoteItem[]): TimeRange[] {
  const timeRanges: TimeRange[] = [];
  
  for (const vote of dayVotes) {
    const parsedTime = parseTimeLabel(vote.tlabel);
    if (!parsedTime.isTimeRecognized || !parsedTime.startTime) continue;
    
    // 時刻を分に変換
    const startMinutes = timeStringToMinutes(parsedTime.startTime);
    let endMinutes: number;
    
    if (parsedTime.endTime) {
      // 終了時刻が指定されている場合
      endMinutes = timeStringToMinutes(parsedTime.endTime);
    } else {
      // 終了時刻が指定されていない場合は1時間後とする
      endMinutes = startMinutes + 60;
    }
    
    timeRanges.push({
      start: startMinutes,
      end: endMinutes
    });
  }
  
  return timeRanges;
}

/** * FormDataから投票データ、日付ラベル、時刻ラベルを一括で抽出する
 * @param formData - フォームデータ
 * @returns 投票データと各種ラベルの配列
 */
export function extractAllDataFromFormData(formData: FormData): {
  votes: VoteData[];
  voteItems: VoteItem[];
  dateLabels: string[];
  timeLabels: string[];
} {
  const votes: VoteData[] = [];
  const voteItems: VoteItem[] = [];
  const dateLabels = new Set<string>();
  const timeLabels = new Set<string>();

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('vote-') && value === 'on') {
      // キーの形式: vote-{eventDateId}-{eventTimeId}
      const parts = key.split('-');
      if (parts.length === 3) {
        const eventDateId = parts[1];
        const eventTimeId = parts[2];
        
        // 対応するラベルを取得
        const dateLabel = formData.get(`date-label-${eventDateId}`) as string || '';
        const timeLabel = formData.get(`time-label-${eventTimeId}`) as string || '';
        
        // VoteDataとVoteItemを作成
        votes.push({
          eventDateId,
          eventTimeId,
          isAvailable: true
        });
        
        voteItems.push({
          did: eventDateId,
          dlabel: dateLabel,
          tid: eventTimeId,
          tlabel: timeLabel,
          isvoted: true
        });
        
        // ラベルを収集
        if (dateLabel) dateLabels.add(dateLabel);
        if (timeLabel) timeLabels.add(timeLabel);
      }
    }
  }

  return {
    votes,
    voteItems,
    dateLabels: Array.from(dateLabels),
    timeLabels: Array.from(timeLabels)
  };
}

/** * FormDataからユーザーの可用性パターンを作成する（VoteItemベース）
 * @param formData - フォームデータ
 * @param userId - ユーザーID
 * @returns 作成されたユーザー可用性パターンの配列
 */
export function createUserAvailabilityPatternsFromFormData(
  formData: FormData,
  userId: string
): UserAvailabilityPattern[] {
  const { voteItems } = extractAllDataFromFormData(formData);
  return createUserAvailabilityPatternsFromVoteItems(voteItems, userId);
}
