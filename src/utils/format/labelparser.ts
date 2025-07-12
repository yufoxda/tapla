
import {addEndTimesToParsedTimes, ParsedTime ,parseDateLabel,parseTimeLabel} from './judgeLabel';

export interface labelData {
    date_labels: string[];
    time_labels: string[];
    is_available: boolean[][]; // [date_index][time_index]
}

export interface ProcessedLabelData {
    date_labels: string[];
    time_labels: string[]; // start-end形式に変換済み
    is_available: boolean[][];
}

export interface TimeRange{
    start: string;  
    end: string;
    is_available: boolean;
}

/**
 * ラベルデータを処理してstart-end形式に変換する関数
 * @param timeLabels - 元のラベルデータ
 * @returns 処理済みのラベルデータ{ start: string, end: string, is_available: boolean | null }[]
 * @description
 * 時刻ラベルを解析し、start-end形式に変換します。
 * 各ラベルは、開始時刻と終了時刻を持つオブジェクトに変換されます。
 * 解析できないラベルは削除されます。
 * 想定しているパターンはparseTimeLabelで定義されています。
 */
export function createTimeRangeFromLabels(
    timeLabels: string[],
): TimeRange[] {
    // todo: 型を修正
    const timeRanges: ParsedTime[] = [];

    for (const label of timeLabels) {
        const TimeRangeLabel = parseTimeLabel(label);

        if( TimeRangeLabel.isTimeRecognized) {
            timeRanges.push({
                startTime: TimeRangeLabel.startTime || '',
                endTime: TimeRangeLabel.endTime || '',
                isTimeRecognized: TimeRangeLabel.isTimeRecognized
            });
        }
    }

    const TimeRangeLabelsWithEndTimes = addEndTimesToParsedTimes(timeRanges);
    
    return timeRanges;
}

/**
 * ラベルデータを処理してstart-end形式に変換する関数
 * @param labelData - 元のラベルデータ
 * @returns 処理済みのラベルデータ
 */
export function processLabels(labelData: labelData): ProcessedLabelData {
    const { date_labels, time_labels, is_available } = labelData;
    
    // すべてのラベルが指定した形式であるかチェック
    const allDatesValid = date_labels.every(label => parseDateLabel(label).isDateRecognized);
    const allTimesValid = time_labels.every(label => parseTimeLabel(label).isTimeRecognized);
    
    if (!allDatesValid || !allTimesValid) {
        // 形式が正しくない場合は元のデータをそのまま返す
        return {
            date_labels,
            time_labels,
            is_available
        };
    }
    
    // 時刻ラベルをParsedTimeの配列に変換
    const parsedTimes: ParsedTime[] = time_labels.map(label => parseTimeLabel(label));
    
    // 単一時刻にendTimeを設定
    const processedParsedTimes = addEndTimesToParsedTimes(parsedTimes);
    
    // ParsedTimeの配列をstart-end形式の文字列配列に変換
    const processedTimeLabels = processedParsedTimes.map(parsed => {
        if (parsed.isTimeRecognized && parsed.startTime && parsed.endTime) {
            return `${parsed.startTime}-${parsed.endTime}`;
        }
        // 元のラベルをそのまま返す（フォールバック）
        const originalIndex = processedParsedTimes.indexOf(parsed);
        return time_labels[originalIndex] || '';
    });
    
    return {
        date_labels,
        time_labels: processedTimeLabels,
        is_available
    };
}


