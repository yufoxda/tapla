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

    //todo: 要確認
    return userAvailability.map((vote) => ({
        userId: user_id,
        startTImeStamp: vote.date.toISOString(),
        endTimeStamp: new Date(vote.date.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 翌日の同時刻
    }));
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
