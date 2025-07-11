import {
  formatVotesDataWithTimeRangeGroupedByDate,
  formatUserAvailability,
  mergeTimeRanges,
  UserAvailabilityPattern,
  votesDataWithTimeRangeGroupedByDate
} from '@/utils/format/recfactor/formatUserAvailability';
import { parseDateLabel } from '@/utils/format/recfactor/judgeLabel';
import { createTimeRangeFromLabels } from '@/utils/format/recfactor/labelParser';

// モックの設定
jest.mock('@/utils/format/recfactor/judgeLabel');
jest.mock('@/utils/format/recfactor/labelParser');

const mockParseDateLabel = parseDateLabel as jest.MockedFunction<typeof parseDateLabel>;
const mockCreateTimeRangeFromLabels = createTimeRangeFromLabels as jest.MockedFunction<typeof createTimeRangeFromLabels>;

describe('formatUserAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatVotesDataWithTimeRangeGroupedByDate', () => {
    test('有効な日付ラベルを正しく処理する', () => {
      const dateLabels = ['2024-07-08', '2024-07-09'];
      const timeRanges = [
        { start: '09:00', end: '10:00', is_available: true },
        { start: '10:00', end: '11:00', is_available: true }
      ];

      mockParseDateLabel
        .mockReturnValueOnce({
          date: new Date(2024, 6, 8), // 7月は6（0から始まる）
          isDateRecognized: true
        })
        .mockReturnValueOnce({
          date: new Date(2024, 6, 9),
          isDateRecognized: true
        });

      const result = formatVotesDataWithTimeRangeGroupedByDate(
        dateLabels,
        timeRanges,
        "testVotesData"
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: new Date(2024, 6, 8),
        time_ranges: timeRanges
      });
      expect(result[1]).toEqual({
        date: new Date(2024, 6, 9),
        time_ranges: timeRanges
      });
    });

    test('認識できない日付ラベルをスキップする', () => {
      const dateLabels = ['invalid-date', '2024-07-08', 'another-invalid'];
      const timeRanges = [
        { start: '09:00', end: '10:00', is_available: true }
      ];

      mockParseDateLabel
        .mockReturnValueOnce({
          date: null,
          isDateRecognized: false
        })
        .mockReturnValueOnce({
          date: new Date(2024, 6, 8),
          isDateRecognized: true
        })
        .mockReturnValueOnce({
          date: null,
          isDateRecognized: false
        });

      const result = formatVotesDataWithTimeRangeGroupedByDate(
        dateLabels,
        timeRanges,
        "testVotesData"
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: new Date(2024, 6, 8),
        time_ranges: timeRanges
      });
    });

    test('空の日付ラベル配列を処理する', () => {
      const dateLabels: string[] = [];
      const timeRanges = [
        { start: '09:00', end: '10:00', is_available: true }
      ];

      const result = formatVotesDataWithTimeRangeGroupedByDate(
        dateLabels,
        timeRanges,
        "testVotesData"
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('formatUserAvailability', () => {
    test('ユーザーの利用可能時間を正しくフォーマットする', () => {
      const user_id = 'test-user-123';
      const dateLabels = ['2024-07-08', '2024-07-09'];
      const timeLabels = ['09:00', '10:00'];

      const mockTimeRanges = [
        { start: '09:00', end: '10:00', is_available: false },
        { start: '10:00', end: '11:00', is_available: false }
      ];

      mockCreateTimeRangeFromLabels.mockReturnValue(mockTimeRanges);
      mockParseDateLabel
        .mockReturnValueOnce({
          date: new Date(2024, 6, 8),
          isDateRecognized: true
        })
        .mockReturnValueOnce({
          date: new Date(2024, 6, 9),
          isDateRecognized: true
        });

      const result = formatUserAvailability(user_id, dateLabels, timeLabels);

      // 日付×時間の組み合わせなので 2日 × 2時間 = 4つの結果になる
      expect(result).toHaveLength(4);
      
      // 最初の結果（2024-07-08 00:00-01:00）
      expect(result[0].userId).toBe(user_id);
      expect(result[0].startTImeStamp).toBe('2024-07-08T00:00:00.000Z');
      expect(result[0].endTimeStamp).toBe('2024-07-08T01:00:00.000Z');
      
      // 2番目の結果（2024-07-08 01:00-02:00）
      expect(result[1].userId).toBe(user_id);
      expect(result[1].startTImeStamp).toBe('2024-07-08T01:00:00.000Z');
      expect(result[1].endTimeStamp).toBe('2024-07-08T02:00:00.000Z');
    });

    test('空の配列を処理する', () => {
      const user_id = 'test-user-123';
      const dateLabels: string[] = [];
      const timeLabels: string[] = [];

      mockCreateTimeRangeFromLabels.mockReturnValue([]);

      const result = formatUserAvailability(user_id, dateLabels, timeLabels);

      expect(result).toHaveLength(0);
    });
  });

  describe('mergeTimeRanges', () => {
    test('同じ日付の時間範囲をマージする', () => {
      const date1 = new Date(2024, 6, 8);
      const date2 = new Date(2024, 6, 9);

      const userVoteData: votesDataWithTimeRangeGroupedByDate[] = [
        {
          date: date1,
          time_ranges: [
            { start: '09:00', end: '10:00', is_available: true }
          ]
        },
        {
          date: date1, // 同じ日付
          time_ranges: [
            { start: '10:00', end: '11:00', is_available: true }
          ]
        },
        {
          date: date2, // 異なる日付
          time_ranges: [
            { start: '14:00', end: '15:00', is_available: true }
          ]
        }
      ];

      const result = mergeTimeRanges(userVoteData);

      expect(result).toHaveLength(2);
      
      // 同じ日付（date1）の時間範囲がマージされているか確認
      const mergedDate1 = result.find(r => r.date === date1);
      expect(mergedDate1?.time_ranges).toHaveLength(2);
      expect(mergedDate1?.time_ranges).toContainEqual(
        { start: '09:00', end: '10:00', is_available: true }
      );
      expect(mergedDate1?.time_ranges).toContainEqual(
        { start: '10:00', end: '11:00', is_available: true }
      );

      // 異なる日付（date2）は単独で存在するか確認
      const date2Entry = result.find(r => r.date === date2);
      expect(date2Entry?.time_ranges).toHaveLength(1);
      expect(date2Entry?.time_ranges).toContainEqual(
        { start: '14:00', end: '15:00', is_available: true }
      );
    });

    test('重複のない日付データを処理する', () => {
      const date1 = new Date(2024, 6, 8);
      const date2 = new Date(2024, 6, 9);

      const userVoteData: votesDataWithTimeRangeGroupedByDate[] = [
        {
          date: date1,
          time_ranges: [
            { start: '09:00', end: '10:00', is_available: true }
          ]
        },
        {
          date: date2,
          time_ranges: [
            { start: '14:00', end: '15:00', is_available: true }
          ]
        }
      ];

      const result = mergeTimeRanges(userVoteData);

      expect(result).toHaveLength(2);
      expect(result).toEqual(userVoteData);
    });

    test('空の配列を処理する', () => {
      const userVoteData: votesDataWithTimeRangeGroupedByDate[] = [];
      const result = mergeTimeRanges(userVoteData);
      expect(result).toHaveLength(0);
    });
  });
});
