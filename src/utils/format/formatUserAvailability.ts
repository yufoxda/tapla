import {type TimeRange} from './labelparser';
import { parseDateLabel, parseTimeLabel } from './judgeLabel';

export interface UserAvailabilityPattern {
    userId: string;
    startTImeStamp: string;
    endTimeStamp: string;
}

export function formatUserAvailability(
    user_id: string,
    dateLabels: string[],
    timeRanges: TimeRange[]
): UserAvailabilityPattern[] {
    const userAvailability: UserAvailabilityPattern[] = [];

    for (const dateLabel of dateLabels) {
        const parsedDate = parseDateLabel(dateLabel);
        if (!parsedDate.isDateRecognized || !parsedDate.date) {
            continue; // 日付が認識できない場合はスキップ
        }

        for (const timeRange of timeRanges) {
            if (!timeRange.start || !timeRange.end) {
                continue; // 時間範囲が不完全な場合はスキップ
            }
            if (!timeRange.is_available) {
                continue; // 利用可能でない時間範囲はスキップ
            }

            const startTimestamp = new Date(parsedDate.date.getFullYear(), parsedDate.date.getMonth(), parsedDate.date.getDate(), ...timeRange.start.split(':').map(Number)).toISOString();
            const endTimestamp = new Date(parsedDate.date.getFullYear(), parsedDate.date.getMonth(), parsedDate.date.getDate(), ...timeRange.end.split(':').map(Number)).toISOString();

            userAvailability.push({
                userId: user_id,
                startTImeStamp: startTimestamp,
                endTimeStamp: endTimestamp
            });
        }
    }

    const mergedAvailability = mergeTimeRanges(userAvailability);

    return userAvailability;
}

export function mergeTimeRanges(
    timeRanges: UserAvailabilityPattern[]
): UserAvailabilityPattern[] {
    if (timeRanges.length === 0) return [];

    // 開始時刻でソート
    timeRanges.sort((a, b) => new Date(a.startTImeStamp).getTime() - new Date(b.startTImeStamp).getTime());

    const merged: UserAvailabilityPattern[] = [];
    let current = timeRanges[0];

    for (let i = 1; i < timeRanges.length; i++) {
        const next = timeRanges[i];

        // 時間範囲が重複しているか、隣接している場合はマージ
        if (new Date(current.endTimeStamp).getTime() >= new Date(next.startTImeStamp).getTime()) {
            current.endTimeStamp = new Date(Math.max(new Date(current.endTimeStamp).getTime(), new Date(next.endTimeStamp).getTime())).toISOString();
        } else {
            merged.push(current);
            current = next;
        }
    }

    merged.push(current); // 最後の範囲を追加

    return merged;
}