import {
  createTimeRangeFromLabels,
  calculateEndTime,
  addEndTimesToParsedTimes,
  TimeRange
} from '@/utils/format/recfactor/labelParser';
import { parseTimeLabel } from '@/utils/format/recfactor/judgeLabel';

// モックの設定
jest.mock('@/utils/format/recfactor/judgeLabel');

const mockParseTimeLabel = parseTimeLabel as jest.MockedFunction<typeof parseTimeLabel>;

describe('labelParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTimeRangeFromLabels', () => {
    test('有効な時刻ラベルを時間範囲に変換する', () => {
      const timeLabels = ['09:00-10:00', '10:00'];

      // parseTimeLabelのモック設定
      mockParseTimeLabel
        .mockReturnValueOnce({
          startTime: '09:00',
          endTime: '10:00',
          isTimeRecognized: true
        })
        .mockReturnValueOnce({
          startTime: '10:00',
          endTime: null,
          isTimeRecognized: true
        });

      const result = createTimeRangeFromLabels(timeLabels);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        start: '09:00',
        end: '10:00',
        is_recognized: true
      });
      expect(result[1]).toEqual({
        start: '10:00',
        end: '11:00', // addEndTimesToParsedTimesによって計算される
        is_recognized: true
      });
    });

    test('認識できない時刻ラベルも含まれる', () => {
      const timeLabels = ['invalid-time', '09:00'];

      mockParseTimeLabel
        .mockReturnValueOnce({
          startTime: null,
          endTime: null,
          isTimeRecognized: false
        })
        .mockReturnValueOnce({
          startTime: '09:00',
          endTime: null,
          isTimeRecognized: true
        });

      const result = createTimeRangeFromLabels(timeLabels);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        start: '',
        end: '',
        is_recognized: false
      });
      expect(result[1]).toEqual({
        start: '09:00',
        end: '10:00',
        is_recognized: true
      });
    });

    test('空の時刻ラベル配列を処理する', () => {
      const timeLabels: string[] = [];

      const result = createTimeRangeFromLabels(timeLabels);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('calculateEndTime', () => {
    test('デフォルト間隔（60分）で終了時刻を計算する', () => {
      const result = calculateEndTime('09:00');
      expect(result).toBe('10:00');
    });

    test('カスタム間隔で終了時刻を計算する', () => {
      const result = calculateEndTime('09:00', 30);
      expect(result).toBe('09:30');
    });

    test('境界値のテスト', () => {
      // 日をまたぐ場合のテスト
      const result1 = calculateEndTime('23:30');
      expect(result1).toBe('23:59'); // 23:59に制限される

      // 深夜の時刻
      const result2 = calculateEndTime('00:00');
      expect(result2).toBe('01:00');
    });
  });

  describe('addEndTimesToParsedTimes', () => {
    test('単一時刻にendTimeを追加する（デフォルト間隔）', () => {
      const parsedTimes: TimeRange[] = [
        { start: '09:00', end: '', is_recognized: true },
        { start: '10:00', end: '', is_recognized: true },
        { start: '11:00', end: '', is_recognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        start: '09:00',
        end: '10:00', // 60分後
        is_recognized: true
      });
      expect(result[1]).toEqual({
        start: '10:00',
        end: '11:00',
        is_recognized: true
      });
      expect(result[2]).toEqual({
        start: '11:00',
        end: '12:00',
        is_recognized: true
      });
    });

    test('時間間隔を推定してendTimeを追加する', () => {
      const parsedTimes: TimeRange[] = [
        { start: '09:00', end: '', is_recognized: true },
        { start: '09:30', end: '', is_recognized: true },
        { start: '10:00', end: '', is_recognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);

      // 30分間隔が推定される
      expect(result[0]).toEqual({
        start: '09:00',
        end: '09:30',
        is_recognized: true
      });
      expect(result[1]).toEqual({
        start: '09:30',
        end: '10:00',
        is_recognized: true
      });
      expect(result[2]).toEqual({
        start: '10:00',
        end: '10:30',
        is_recognized: true
      });
    });

    test('カスタムデフォルト間隔を使用する', () => {
      const parsedTimes: TimeRange[] = [
        { start: '09:00', end: '', is_recognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes, 90); // 90分間隔

      expect(result[0]).toEqual({
        start: '09:00',
        end: '10:30',
        is_recognized: true
      });
    });

    test('空の配列を処理する', () => {
      const parsedTimes: TimeRange[] = [];

      const result = addEndTimesToParsedTimes(parsedTimes);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    test('既にendTimeがある時間範囲はそのまま保持する', () => {
      const parsedTimes: TimeRange[] = [
        { start: '09:00', end: '', is_recognized: true },
        { start: '10:00', end: '11:00', is_recognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);

      expect(result[0]).toEqual({
        start: '09:00',
        end: '10:00',
        is_recognized: true
      });
      expect(result[1]).toEqual({
        start: '10:00',
        end: '11:00', // 既存のendTimeを保持
        is_recognized: true
      });
    });

    test('認識されていない時刻はそのまま保持する', () => {
      const parsedTimes: TimeRange[] = [
        { start: '', end: '', is_recognized: false },
        { start: '09:00', end: '', is_recognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);

      expect(result[0]).toEqual({
        start: '',
        end: '',
        is_recognized: false // そのまま保持
      });
      expect(result[1]).toEqual({
        start: '09:00',
        end: '10:00',
        is_recognized: true
      });
    });
  });
});