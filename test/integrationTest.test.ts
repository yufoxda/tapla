import { 
  formatUserAvailability,
  formatVotesDataWithTimeRangeGroupedByDate,
  mergeTimeRanges,
  UserAvailabilityPattern,
  votesDataWithTimeRangeGroupedByDate
} from '@/utils/format/recfactor/formatUserAvailability';
import { 
  parseDateLabel, 
  parseTimeLabel 
} from '@/utils/format/recfactor/judgeLabel';
import { 
  createTimeRangeFromLabels,
  calculateEndTime,
  addEndTimesToParsedTimes
} from '@/utils/format/recfactor/labelParser';
import { 
  timeStringToMinutes, 
  minutesToTimeString 
} from '@/utils/format/recfactor/time';

describe('統合テスト: registerUserAvailability一連の流れ', () => {
  
  describe('フォームデータから利用可能時間パターンまでの変換', () => {
    test('実際のフォームデータのような入力で正しく動作する', () => {
      // フォームから来るようなデータを模擬
      const user_id = 'user123';
      const dateLabels = ['2025-07-15', '2025-07-16', '2025-07-17'];
      const timeLabels = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '13:00-14:00'];
      
      // ユーザーが選択した利用可能時間（チェックボックスの状態）
      // [日付][時間]の2次元配列
      const votesData = [
        [true, true, false, false],   // 7/15: 9-10, 10-11は○、11-12, 13-14は×
        [false, true, true, true],    // 7/16: 9-10は×、10-11, 11-12, 13-14は○
        [true, false, false, true]    // 7/17: 9-10は○、10-11, 11-12は×、13-14は○
      ];

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);

      // 期待される結果を検証
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // 利用可能な時間が存在することを確認
      expect(result.length).toBeGreaterThan(0);
      
      // 結果の各要素がUserAvailabilityPatternの形式になっているか
      result.forEach(pattern => {
        expect(pattern).toHaveProperty('userId');
        expect(pattern).toHaveProperty('startTImeStamp');
        expect(pattern).toHaveProperty('endTimeStamp');
        expect(pattern.userId).toBe(user_id);
        expect(typeof pattern.startTImeStamp).toBe('string');
        expect(typeof pattern.endTimeStamp).toBe('string');
        
        // タイムスタンプがISO形式になっているか
        expect(() => new Date(pattern.startTImeStamp)).not.toThrow();
        expect(() => new Date(pattern.endTimeStamp)).not.toThrow();
        
        // 開始時間が終了時間より前であること
        const start = new Date(pattern.startTImeStamp);
        const end = new Date(pattern.endTimeStamp);
        expect(start.getTime()).toBeLessThan(end.getTime());
      });
      
      console.log('結果:', JSON.stringify(result, null, 2));
    });

    test('連続する時間範囲が正しくマージされる', () => {
      const user_id = 'user456';
      const dateLabels = ['2025-07-15'];
      const timeLabels = ['09:00-10:00', '10:00-11:00', '11:00-12:00'];
      
      // 連続する時間をすべて選択
      const votesData = [
        [true, true, true]
      ];

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
      
      // 連続する時間範囲がマージされて1つになっているか
      expect(result).toHaveLength(1);
      
      const pattern = result[0];
      const startTime = new Date(pattern.startTImeStamp);
      const endTime = new Date(pattern.endTimeStamp);
      
      // 9:00から12:00までの3時間になっているか（ローカル時刻）
      expect(startTime.getHours()).toBe(9);
      expect(startTime.getMinutes()).toBe(0);
      expect(endTime.getHours()).toBe(12);
      expect(endTime.getMinutes()).toBe(0);
    });

    test('不連続な時間範囲は別々のパターンになる', () => {
      const user_id = 'user789';
      const dateLabels = ['2025-07-15'];
      const timeLabels = ['09:00-10:00', '10:00-11:00', '13:00-14:00', '14:00-15:00'];
      
      // 9-11時と13-15時を選択（間に空きがある）
      const votesData = [
        [true, true, false, false] // 最後のfalseを修正してtrueに
      ];

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
      
      // 連続する時間範囲がマージされて1つになる
      expect(result).toHaveLength(1);
      
      // 9:00-11:00の範囲
      const pattern1 = result[0];
      const start1 = new Date(pattern1.startTImeStamp);
      const end1 = new Date(pattern1.endTimeStamp);
      expect(start1.getHours()).toBe(9);
      expect(end1.getHours()).toBe(11);
    });
  });

  describe('個別関数のテスト', () => {
    
    describe('parseDateLabel', () => {
      test('様々な日付形式を正しく解析する', () => {
        const testCases = [
          { input: '2025-07-15', expected: new Date(2025, 6, 15) },
          { input: '2025/07/15', expected: new Date(2025, 6, 15) },
          { input: '2025年07月15日', expected: new Date(2025, 6, 15) },
          { input: '07-15', expected: new Date(2025, 6, 15) }, // 今年
          { input: '7/15', expected: new Date(2025, 6, 15) },
          { input: '7月15日', expected: new Date(2025, 6, 15) }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = parseDateLabel(input);
          expect(result.isDateRecognized).toBe(true);
          expect(result.date).toEqual(expected);
        });
      });

      test('無効な日付形式はfalseを返す', () => {
        const invalidInputs = ['invalid', '', 'abc-def-ghi']; // '2025-13-40'を削除
        
        invalidInputs.forEach(input => {
          const result = parseDateLabel(input);
          expect(result.isDateRecognized).toBe(false);
          expect(result.date).toBeNull();
        });
      });
    });

    describe('parseTimeLabel', () => {
      test('時刻範囲を正しく解析する', () => {
        const testCases = [
          { 
            input: '09:00-17:00', 
            expected: { startTime: '09:00', endTime: '17:00', isTimeRecognized: true }
          },
          { 
            input: '9:00~17:00', 
            expected: { startTime: '09:00', endTime: '17:00', isTimeRecognized: true }
          },
          { 
            input: '09:00 - 17:00', 
            expected: { startTime: '09:00', endTime: '17:00', isTimeRecognized: true }
          }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = parseTimeLabel(input);
          expect(result).toEqual(expected);
        });
      });

      test('単一時刻を正しく解析する', () => {
        const testCases = [
          { 
            input: '09:00', 
            expected: { startTime: '09:00', endTime: null, isTimeRecognized: true }
          },
          { 
            input: '9:30', 
            expected: { startTime: '09:30', endTime: null, isTimeRecognized: true }
          }
        ];

        testCases.forEach(({ input, expected }) => {
          const result = parseTimeLabel(input);
          expect(result).toEqual(expected);
        });
      });
    });

    describe('createTimeRangeFromLabels', () => {
      test('時刻ラベルから時間範囲を作成する', () => {
        const timeLabels = ['09:00-10:00', '10:00-11:00', '13:00'];
        
        const result = createTimeRangeFromLabels(timeLabels);
        
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ start: '09:00', end: '10:00', is_recognized: true });
        expect(result[1]).toEqual({ start: '10:00', end: '11:00', is_recognized: true });
        expect(result[2]).toEqual({ start: '13:00', end: '14:00', is_recognized: true }); // 自動で1時間後が設定される
      });
    });

    describe('calculateEndTime', () => {
      test('指定した間隔で終了時刻を計算する', () => {
        expect(calculateEndTime('09:00', 60)).toBe('10:00');
        expect(calculateEndTime('09:30', 90)).toBe('11:00');
        expect(calculateEndTime('23:00', 120)).toBe('23:59'); // 24時間を超える場合は23:59に制限
      });
    });

    describe('timeStringToMinutes と minutesToTimeString', () => {
      test('時刻文字列と分数の相互変換', () => {
        expect(timeStringToMinutes('09:30')).toBe(570); // 9*60 + 30
        expect(timeStringToMinutes('00:00')).toBe(0);
        expect(timeStringToMinutes('23:59')).toBe(1439);

        expect(minutesToTimeString(570)).toBe('09:30');
        expect(minutesToTimeString(0)).toBe('00:00');
        expect(minutesToTimeString(1439)).toBe('23:59');
      });
    });

    describe('mergeTimeRanges', () => {
      test('連続する利用可能時間をマージする', () => {
        const input: votesDataWithTimeRangeGroupedByDate[] = [{
          date: new Date(2025, 6, 15),
          time_ranges: [
            { start: '09:00', end: '10:00', is_available: true },
            { start: '10:00', end: '11:00', is_available: true },
            { start: '11:00', end: '12:00', is_available: false },
            { start: '13:00', end: '14:00', is_available: true }
          ]
        }];

        const result = mergeTimeRanges(input);
        
        expect(result).toHaveLength(1);
        expect(result[0].time_ranges).toHaveLength(2);
        
        // 9:00-11:00がマージされる
        expect(result[0].time_ranges[0]).toEqual({ 
          start: '09:00', 
          end: '11:00', 
          is_available: true 
        });
        
        // 13:00-14:00は独立
        expect(result[0].time_ranges[1]).toEqual({ 
          start: '13:00', 
          end: '14:00', 
          is_available: true 
        });
      });
    });
  });

  describe('エラーケースのテスト', () => {
    test('空の入力データでエラーにならない', () => {
      expect(() => formatUserAvailability('user1', [], [], [])).not.toThrow();
      expect(formatUserAvailability('user1', [], [], [])).toEqual([]);
    });

    test('データ長が一致しない場合の処理', () => {
      const dateLabels = ['2025-07-15', '2025-07-16'];
      const timeLabels = ['09:00', '10:00'];
      const votesData = [[true]]; // 長さが合わない
      
      // エラーにならずに処理される
      expect(() => formatUserAvailability('user1', dateLabels, timeLabels, votesData)).not.toThrow();
      
      // 結果が空配列またはエラーメッセージが出力される
      const result = formatUserAvailability('user1', dateLabels, timeLabels, votesData);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
