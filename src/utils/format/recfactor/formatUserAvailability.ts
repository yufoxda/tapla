import { type TimeRange } from "./labelParser";
import { parseDateLabel } from "./judgeLabel";
import {createTimeRangeFromLabels} from "./labelParser";

export interface votesDataWithTimeRangeGroupedByDate {
    date: Date;
    time_ranges: TimeRange[];
}

export interface UserAvailabilityPattern {
    userId: string;
    startTImeStamp: string;
    endTimeStamp: string;
}

export function formatVotesDataWithTimeRangeGroupedByDate(
    dateLabels: string[],
    timeRanges: TimeRange[],
    votesData: String
): votesDataWithTimeRangeGroupedByDate[] {
    const userAvailability: votesDataWithTimeRangeGroupedByDate[] = [];

    for (const vote of dateLabels) {
        const parsedDate = parseDateLabel(vote);
        if (!parsedDate.isDateRecognized || !parsedDate.date) {
            continue; // 日付が認識できない場合はスキップ
        }

        userAvailability.push({
            date: parsedDate.date,
            time_ranges: timeRanges
         })
    }
    return userAvailability;
}

/**
 * ユーザーの利用可能時間をフォーマットする関数
 * @param user_id - ユーザーID
 * @param dateLabels - 日付ラベルの配列
 * @param timeRanges - 時間範囲の配列
 * @returns フォーマットされたユーザーの利用可能時間パターンの配列
 * @description
 * ユーザーの利用可能時間を、指定された日付と時間範囲に基づいてフォーマットします。
 * 各時間範囲は、開始時刻と終了時刻を持つ
 * 規定パターンでないものはスキップされます。
 */
export function formatUserAvailability(
    user_id: string,
    dateLabels: string[],
    timeLabels: string[]
): UserAvailabilityPattern[] {
    
    const TimeRangesWithEndTimes = createTimeRangeFromLabels(timeLabels);
    const userVoteData = formatVotesDataWithTimeRangeGroupedByDate(
        dateLabels,
        TimeRangesWithEndTimes,
        "votesData"
    );

    const userAvailability = mergeTimeRanges(userVoteData);

    // 各日付と時間範囲の組み合わせでユーザー利用可能時間を生成
    const result: UserAvailabilityPattern[] = [];
    
    userAvailability.forEach((vote) => {
        vote.time_ranges.forEach((timeRange) => {
            // 日付に時間を設定したタイムスタンプを作成
            const startDate = new Date(vote.date);
            const endDate = new Date(vote.date);
            
            // 時間を設定
            const [startHour, startMinute] = timeRange.start.split(':').map(Number);
            const [endHour, endMinute] = timeRange.end.split(':').map(Number);
            
            startDate.setHours(startHour, startMinute, 0, 0);
            endDate.setHours(endHour, endMinute, 0, 0);
            
            // 終了時間が開始時間より前の場合（日をまたぐ場合）、翌日に設定
            if (endDate <= startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }
            
            result.push({
                userId: user_id,
                startTImeStamp: startDate.toISOString(),
                endTimeStamp: endDate.toISOString(),
            });
        });
    });
    
    return result;
}



export function mergeTimeRanges(
   userVoteData:votesDataWithTimeRangeGroupedByDate[]
): votesDataWithTimeRangeGroupedByDate[] {
    const mergedData: votesDataWithTimeRangeGroupedByDate[] = [];

    userVoteData.forEach((vote) => {
        const existingDate = mergedData.find(d => d.date === vote.date);
        
        if (existingDate) {
            // 既存の日付が見つかった場合、時間範囲を追加
            existingDate.time_ranges.push(...vote.time_ranges);
        } else {
            // 新しい日付の場合、エントリを追加
            mergedData.push({
                date: vote.date,
                time_ranges: [...vote.time_ranges]
            });
        }
    });

    return mergedData;
}
