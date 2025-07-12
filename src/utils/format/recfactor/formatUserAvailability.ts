import { type TimeRange } from "./labelParser";
import { parseDateLabel } from "./judgeLabel";
import {createTimeRangeFromLabels} from "./labelParser";

export interface votesDataWithTimeRangeGroupedByDate {
    date: Date;
    time_ranges: {
        start: string;
        end: string;
        is_available: boolean;
    }[];
}

export interface UserAvailabilityPattern {
    userId: string | null;
    startTImeStamp: string;
    endTimeStamp: string;
}



/**
 * ユーザーの利用可能時間をフォーマットする関数
 * @param user_id - ユーザーID
 * @param dateLabels - 日付ラベルの配列
 * @param timeLabels - 時間ラベルの配列
 * @param votesData - 投票データの2次元配列（日付×時間範囲）
 * @returns フォーマットされたユーザーの利用可能時間パターンの配列
 * @description
 * ユーザーの利用可能時間を、指定された日付と時間範囲に基づいてフォーマットします。
 * 各時間範囲は、開始時刻と終了時刻を持つ
 * 規定パターンでないものはスキップされます。
 */
export function formatUserAvailability(
    user_id: string | null,
    dateLabels: string[],
    timeLabels: string[],
    votesData: boolean[][]
): UserAvailabilityPattern[] {
    
    const TimeRangesWithEndTimes = createTimeRangeFromLabels(timeLabels);
    const userVoteData = formatVotesDataWithTimeRangeGroupedByDate(
        dateLabels,
        TimeRangesWithEndTimes,
        votesData
    );

    const userAvailability = mergeTimeRanges(userVoteData);

    // 各日付と時間範囲の組み合わせでユーザー利用可能時間を生成
    const result: UserAvailabilityPattern[] = [];
    
    userAvailability.forEach((vote) => {
        vote.time_ranges.forEach((timeRange) => {
            // 日付に時間を設定したタイムスタンプを作成（タイムゾーン情報なし）
            const baseDate = new Date(vote.date);
            const startDate = new Date(
                baseDate.getFullYear(),
                baseDate.getMonth(),
                baseDate.getDate()
            );
            const endDate = new Date(
                baseDate.getFullYear(),
                baseDate.getMonth(),
                baseDate.getDate()
            );
            
            // 時間を設定
            const [startHour, startMinute] = timeRange.start.split(':').map(Number);
            const [endHour, endMinute] = timeRange.end.split(':').map(Number);
            
            startDate.setHours(startHour, startMinute, 0, 0);
            endDate.setHours(endHour, endMinute, 0, 0);
            
            // 終了時間が開始時間より前の場合（日をまたぐ場合）、翌日に設定
            if (endDate <= startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }
            
            // タイムゾーン情報を除いた形式で文字列化（データベース用）
            const formatTimestamp = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
            };
            
            result.push({
                userId: user_id ?? null,
                startTImeStamp: formatTimestamp(startDate),
                endTimeStamp: formatTimestamp(endDate),
            });
        });
    });
    
    return result;
}



/** * 日付ラベルと時間範囲を組み合わせて、日付ごとに時間範囲をグループ化する関数
 * @param dateLabels - 日付ラベルの配列
 * @param timeRanges - 時間範囲の配列   
 * @param votesData - 投票データの2次元配列（日付×時間範囲）
 * @returns 日付ごとにグループ化された時間範囲の配列
 * @description
 * 日付ラベルを解析し、各日付に対して時間範囲
 * をグループ化します。
 * 各日付はDateオブジェクトとして格納され、時間範囲は
 * TimeRangeオブジェクトの配列として格納されます。  
 * 認識できない日付ラベルはスキップされます。
 */
export function formatVotesDataWithTimeRangeGroupedByDate(
    dateLabels: string[],
    timeRanges: TimeRange[],
    votesData: boolean[][]
): votesDataWithTimeRangeGroupedByDate[] {
    const userAvailability: votesDataWithTimeRangeGroupedByDate[] = [];

    for (let dateIndex = 0; dateIndex < dateLabels.length; dateIndex++) {
        const vote = dateLabels[dateIndex];
        const parsedDate = parseDateLabel(vote);
        if (!parsedDate.isDateRecognized || !parsedDate.date) {
            continue; // 日付が認識できない場合はスキップ
        }

        // 対応する投票データがない場合はスキップ
        if (!votesData[dateIndex] || votesData[dateIndex].length !== timeRanges.length) {
            console.warn(`Date label "${vote}" does not match time ranges length.`);
            continue;
        }

        userAvailability.push({
            date: parsedDate.date,
            time_ranges: timeRanges.map((timeRange, timeIndex) => ({
                start: timeRange.start,
                end: timeRange.end,
                is_available: votesData[dateIndex][timeIndex]
            }))
        });
    }
    return userAvailability;
}



/**
 * 連続する時間範囲をマージする補助関数
 * @param timeRanges - マージする時間範囲の配列
 * @returns マージされた時間範囲の配列
 */
function mergeContinuousTimeRanges(timeRanges: {start: string, end: string, is_available: boolean}[]): {start: string, end: string, is_available: boolean}[] {
    if (timeRanges.length === 0) return [];

    // 開始時刻でソート
    const sorted = [...timeRanges].sort((a, b) => {
        const [aHour, aMin] = a.start.split(':').map(Number);
        const [bHour, bMin] = b.start.split(':').map(Number);
        return aHour * 60 + aMin - (bHour * 60 + bMin);
    });

    const merged: {start: string, end: string, is_available: boolean}[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        
        // 現在の終了時刻と次の開始時刻が同じ場合（連続している場合）
        if (current.end === next.start) {
            // 終了時刻を延長
            current.end = next.end;
        } else {
            // 連続していない場合、現在のものを保存して新しいものを開始
            merged.push(current);
            current = { ...next };
        }
    }
    
    // 最後の範囲を追加
    merged.push(current);
    
    return merged;
}

/**
 * ユーザーの投票データを日付ごとにマージする関数
 * @param userVoteDataBasedTimeRange - ユーザーの投票データの配列
 * @returns マージされた投票データの配列
 * @description
 * ユーザーの投票データを日付ごとにマージし、同じ日付の時間範囲を統合します。
 * 連続する時間範囲は自動的にマージされます。
 */
export function mergeTimeRanges(
   userVoteDataBasedTimeRange:votesDataWithTimeRangeGroupedByDate[]
): votesDataWithTimeRangeGroupedByDate[] {
    const dateMap = new Map<string, votesDataWithTimeRangeGroupedByDate>();

    for (const vote of userVoteDataBasedTimeRange) {
        const dateKey = vote.date.getTime().toString(); // 日付をキーとして使用

        // 利用可能な時間範囲のみをフィルタ
        const availableTimeRanges = vote.time_ranges.filter(tr => tr.is_available);
        
        if (availableTimeRanges.length === 0) {
            continue; // 利用可能な時間範囲がない場合はスキップ
        }

        if (dateMap.has(dateKey)) {
            // 既存の日付エントリに時間範囲を追加
            const existingEntry = dateMap.get(dateKey)!;
            existingEntry.time_ranges.push(...availableTimeRanges);
        } else {
            // 新しい日付エントリを作成
            dateMap.set(dateKey, {
                date: vote.date,
                time_ranges: [...availableTimeRanges]
            });
        }
    }

    // 各日付の時間範囲をマージ
    const result = Array.from(dateMap.values()).map(entry => ({
        ...entry,
        time_ranges: mergeContinuousTimeRanges(entry.time_ranges)
    }));

    return result;
}
