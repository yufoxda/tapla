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
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' }
      ];
      const votesData = [
        [true, false],   // 2024-07-08の利用可能性
        [false, true]    // 2024-07-09の利用可能性
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
        votesData
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: new Date(2024, 6, 8),
        time_ranges: [
          { start: '09:00', end: '10:00', is_available: true },
          { start: '10:00', end: '11:00', is_available: false }
        ]
      });
      expect(result[1]).toEqual({
        date: new Date(2024, 6, 9),
        time_ranges: [
          { start: '09:00', end: '10:00', is_available: false },
          { start: '10:00', end: '11:00', is_available: true }
        ]
      });
    });

    test('認識できない日付ラベルをスキップする', () => {
      const dateLabels = ['invalid-date', '2024-07-08', 'another-invalid'];
      const timeRanges = [
        { start: '09:00', end: '10:00' }
      ];
      const votesData = [
        [false], // invalid-date: 処理されない
        [true],  // 2024-07-08
        [false]  // another-invalid: 処理されない
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
        votesData
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: new Date(2024, 6, 8),
        time_ranges: [
          { start: '09:00', end: '10:00', is_available: true }
        ]
      });
    });

    test('空の日付ラベル配列を処理する', () => {
      const dateLabels: string[] = [];
      const timeRanges = [
        { start: '09:00', end: '10:00' }
      ];
      const votesData: boolean[][] = [];

      const result = formatVotesDataWithTimeRangeGroupedByDate(
        dateLabels,
        timeRanges,
        votesData
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('formatUserAvailability', () => {
    test('ユーザーの利用可能時間を正しくフォーマットする', () => {
      const user_id = 'test-user-123';
      const dateLabels = ['2024-07-08', '2024-07-09'];
      const timeLabels = ['09:00-10:00', '10:00-11:00'];
      const votesData = [
        [true, false],   // 2024-07-08: 09:00-10:00は利用可能、10:00-11:00は利用不可
        [false, true]    // 2024-07-09: 09:00-10:00は利用不可、10:00-11:00は利用可能
      ];

      const mockTimeRanges = [
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' }
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

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);

      // 利用可能な時間のみが返される：2024-07-08の09:00-10:00 と 2024-07-09の10:00-11:00
      expect(result).toHaveLength(2);
      
      // 最初の結果（2024-07-08 09:00-10:00） - ローカル時刻なので入力日付のまま
      expect(result[0].userId).toBe(user_id);
      expect(result[0].startTImeStamp).toMatch(/2024-07-08T09:00:00/);
      expect(result[0].endTimeStamp).toMatch(/2024-07-08T10:00:00/);
      
      // 2番目の結果（2024-07-09 10:00-11:00）
      expect(result[1].userId).toBe(user_id);
      expect(result[1].startTImeStamp).toMatch(/2024-07-09T10:00:00/);
      expect(result[1].endTimeStamp).toMatch(/2024-07-09T11:00:00/);
    });

    test('空の配列を処理する', () => {
      const user_id = 'test-user-123';
      const dateLabels: string[] = [];
      const timeLabels: string[] = [];
      const votesData: boolean[][] = [];

      mockCreateTimeRangeFromLabels.mockReturnValue([]);

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);

      expect(result).toHaveLength(0);
    });
  });

  describe('mergeTimeRanges', () => {
    test('同じ日付の連続する時間範囲をマージする', () => {
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
      
      // 同じ日付（date1）の連続する時間範囲がマージされているか確認
      const mergedDate1 = result.find(r => r.date === date1);
      expect(mergedDate1?.time_ranges).toHaveLength(1); // 連続時間がマージされて1つになる
      expect(mergedDate1?.time_ranges[0]).toEqual(
        { start: '09:00', end: '11:00', is_available: true }
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
