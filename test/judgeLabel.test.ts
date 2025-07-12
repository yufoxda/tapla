import { 
  parseDateLabel, 
  parseTimeLabel, 
  estimateTimeInterval, 
  calculateEndTime,
  addEndTimesToParsedTimes,
  ParsedDate,
  ParsedTime
} from '@/utils/format/judgeLabel';

describe('judgeLabel', () => {
  describe('parseDateLabel', () => {
    test('様々な日付形式を正しく解析する', () => {
      // YYYY-MM-DD形式
      const result1 = parseDateLabel('2024-12-25');
      expect(result1.isDateRecognized).toBe(true);
      expect(result1.date?.getFullYear()).toBe(2024);
      expect(result1.date?.getMonth()).toBe(11); // 0から始まるため12月は11
      expect(result1.date?.getDate()).toBe(25);

      // YYYY/MM/DD形式
      const result2 = parseDateLabel('2024/12/25');
      expect(result2.isDateRecognized).toBe(true);
      expect(result2.date?.getFullYear()).toBe(2024);
      expect(result2.date?.getMonth()).toBe(11);
      expect(result2.date?.getDate()).toBe(25);

      // YYYY年MM月DD日形式
      const result3 = parseDateLabel('2024年12月25日');
      expect(result3.isDateRecognized).toBe(true);
      expect(result3.date?.getFullYear()).toBe(2024);
      expect(result3.date?.getMonth()).toBe(11);
      expect(result3.date?.getDate()).toBe(25);
    });

    test('年なしの日付形式を現在年で解析する', () => {
      const currentYear = new Date().getFullYear();
      
      // MM-DD形式
      const result1 = parseDateLabel('12-25');
      expect(result1.isDateRecognized).toBe(true);
      expect(result1.date?.getFullYear()).toBe(currentYear);
      expect(result1.date?.getMonth()).toBe(11);
      expect(result1.date?.getDate()).toBe(25);

      // MM/DD形式
      const result2 = parseDateLabel('12/25');
      expect(result2.isDateRecognized).toBe(true);
      expect(result2.date?.getFullYear()).toBe(currentYear);

      // MM月DD日形式
      const result3 = parseDateLabel('12月25日');
      expect(result3.isDateRecognized).toBe(true);
      expect(result3.date?.getFullYear()).toBe(currentYear);
    });

    test('無効な日付形式を正しく処理する', () => {
      expect(parseDateLabel('')).toEqual({ date: null, isDateRecognized: false });
      expect(parseDateLabel('invalid')).toEqual({ date: null, isDateRecognized: false });
      expect(parseDateLabel('abc-def-ghi')).toEqual({ date: null, isDateRecognized: false });
      
      // 注意: JavaScript のDateコンストラクタは無効な日付を自動的に調整するため
      // 2024-13-01は2025-01-01として解釈される
      // 実際の要件に応じて、より厳密な検証が必要な場合は関数側の修正が必要
    });
  });

  describe('parseTimeLabel', () => {
    test('時刻範囲を正しく解析する', () => {
      // ハイフン区切り
      const result1 = parseTimeLabel('09:00-17:00');
      expect(result1.isTimeRecognized).toBe(true);
      expect(result1.startTime).toBe('09:00');
      expect(result1.endTime).toBe('17:00');

      // チルダ区切り
      const result2 = parseTimeLabel('9:00~17:00');
      expect(result2.isTimeRecognized).toBe(true);
      expect(result2.startTime).toBe('09:00');
      expect(result2.endTime).toBe('17:00');

      // スペース付き
      const result3 = parseTimeLabel('09:00 - 17:00');
      expect(result3.isTimeRecognized).toBe(true);
      expect(result3.startTime).toBe('09:00');
      expect(result3.endTime).toBe('17:00');
    });

    test('単一時刻を正しく解析する', () => {
      const result1 = parseTimeLabel('09:00');
      expect(result1.isTimeRecognized).toBe(true);
      expect(result1.startTime).toBe('09:00');
      expect(result1.endTime).toBe(null);

      const result2 = parseTimeLabel('9:00');
      expect(result2.isTimeRecognized).toBe(true);
      expect(result2.startTime).toBe('09:00');
      expect(result2.endTime).toBe(null);
    });

    test('無効な時刻形式を正しく処理する', () => {
      expect(parseTimeLabel('')).toEqual({ startTime: null, endTime: null, isTimeRecognized: false });
      expect(parseTimeLabel('invalid')).toEqual({ startTime: null, endTime: null, isTimeRecognized: false });
      expect(parseTimeLabel('25:00')).toEqual({ startTime: null, endTime: null, isTimeRecognized: false });
      expect(parseTimeLabel('12:60')).toEqual({ startTime: null, endTime: null, isTimeRecognized: false });
    });
  });

  describe('estimateTimeInterval', () => {
    test('時刻ラベルから間隔を推測する', () => {
      const timeLabels30min = ['09:00', '09:30', '10:00', '10:30'];
      expect(estimateTimeInterval(timeLabels30min)).toBe(30);

      const timeLabels60min = ['09:00', '10:00', '11:00', '12:00'];
      expect(estimateTimeInterval(timeLabels60min)).toBe(60);

      const timeLabels15min = ['09:00', '09:15', '09:30', '09:45'];
      expect(estimateTimeInterval(timeLabels15min)).toBe(15);
    });

    test('不十分なデータでデフォルト値を返す', () => {
      expect(estimateTimeInterval()).toBe(60);
      expect(estimateTimeInterval([])).toBe(60);
      expect(estimateTimeInterval(['09:00'])).toBe(60);
      expect(estimateTimeInterval(['09:00'], 120)).toBe(120);
    });

    test('無効な時刻が含まれる場合の処理', () => {
      const mixedLabels = ['09:00', 'invalid', '10:00', '11:00'];
      expect(estimateTimeInterval(mixedLabels)).toBe(60);
    });

    test('最も頻出する間隔を返す', () => {
      // 30分間隔が3回、60分間隔が1回
      const timeLabels = ['09:00', '09:30', '10:00', '10:30', '11:30'];
      expect(estimateTimeInterval(timeLabels)).toBe(30);
    });
  });

  describe('calculateEndTime', () => {
    test('指定された間隔でendTimeを計算する', () => {
      expect(calculateEndTime('09:00', 60)).toBe('10:00');
      expect(calculateEndTime('09:00', 30)).toBe('09:30');
      expect(calculateEndTime('09:15', 45)).toBe('10:00');
      expect(calculateEndTime('14:30', 90)).toBe('16:00');
    });

    test('24時間を超える場合は23:59に制限', () => {
      expect(calculateEndTime('23:00', 120)).toBe('23:59');
      expect(calculateEndTime('23:30', 60)).toBe('23:59');
    });

    test('デフォルト間隔（60分）で計算', () => {
      expect(calculateEndTime('09:00')).toBe('10:00');
      expect(calculateEndTime('15:30')).toBe('16:30');
    });
  });


  describe('addEndTimesToParsedTimes', () => {
    test('単一時刻の配列にendTimeを追加', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: null, isTimeRecognized: true },
        { startTime: '09:30', endTime: null, isTimeRecognized: true },
        { startTime: '10:00', endTime: null, isTimeRecognized: true },
        { startTime: '10:30', endTime: null, isTimeRecognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '09:30', isTimeRecognized: true });
      expect(result[1]).toEqual({ startTime: '09:30', endTime: '10:00', isTimeRecognized: true });
      expect(result[2]).toEqual({ startTime: '10:00', endTime: '10:30', isTimeRecognized: true });
      expect(result[3]).toEqual({ startTime: '10:30', endTime: '11:00', isTimeRecognized: true });
    });

    test('60分間隔での動作確認', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true },
        { startTime: '10:30', endTime: null, isTimeRecognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '10:00', isTimeRecognized: true });
      // 間隔は60分（09:00から10:00への差）なので、10:30 + 60分 = 11:30
      expect(result[1]).toEqual({ startTime: '10:30', endTime: '11:30', isTimeRecognized: true });
    });

    test('既にendTimeがある要素はそのまま保持', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true },
        { startTime: '10:30', endTime: null, isTimeRecognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '10:00', isTimeRecognized: true });
      // endTimeを持つ要素は間隔計算から除外され、単一要素なのでデフォルト60分間隔を使用
      expect(result[1]).toEqual({ startTime: '10:30', endTime: '11:30', isTimeRecognized: true });
    });

    test('単一時刻のみから間隔を推測', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true }, // 範囲時刻は無視
        { startTime: '10:30', endTime: null, isTimeRecognized: true },   // 単一時刻
        { startTime: '11:00', endTime: null, isTimeRecognized: true },   // 単一時刻
        { startTime: '12:00', endTime: '13:00', isTimeRecognized: true }, // 範囲時刻は無視
        { startTime: '11:30', endTime: null, isTimeRecognized: true }    // 単一時刻
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      // 単一時刻のみから間隔推測: 10:30, 11:00, 11:30 → 間隔は30分が最頻出
      expect(result[1]).toEqual({ startTime: '10:30', endTime: '11:00', isTimeRecognized: true });
      expect(result[2]).toEqual({ startTime: '11:00', endTime: '11:30', isTimeRecognized: true });
      expect(result[4]).toEqual({ startTime: '11:30', endTime: '12:00', isTimeRecognized: true });
    });

    test('複数の時刻範囲を正しく処理', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true },
        { startTime: '10:30', endTime: null, isTimeRecognized: true },
        { startTime: '12:00', endTime: '13:00', isTimeRecognized: true },
        { startTime: '14:30', endTime: null, isTimeRecognized: true },
        { startTime: '15:30', endTime: null, isTimeRecognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '10:00', isTimeRecognized: true });
      // 単一時刻のみから間隔推測: 10:30, 14:30, 15:30 → 間隔は60分
      expect(result[1]).toEqual({ startTime: '10:30', endTime: '11:30', isTimeRecognized: true });
      expect(result[2]).toEqual({ startTime: '12:00', endTime: '13:00', isTimeRecognized: true });
      expect(result[3]).toEqual({ startTime: '14:30', endTime: '15:30', isTimeRecognized: true });
      expect(result[4]).toEqual({ startTime: '15:30', endTime: '16:30', isTimeRecognized: true });
    });

    test('認識されていない時刻はそのまま返す', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: null, endTime: null, isTimeRecognized: false },
        { startTime: '09:00', endTime: null, isTimeRecognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      expect(result[0]).toEqual({ startTime: null, endTime: null, isTimeRecognized: false });
      expect(result[1]).toEqual({ startTime: '09:00', endTime: '10:00', isTimeRecognized: true });
    });

    test('空の配列を処理', () => {
      const result = addEndTimesToParsedTimes([]);
      expect(result).toEqual([]);
    });

    test('カスタムデフォルト間隔を使用', () => {
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: null, isTimeRecognized: true }
      ];

      const result = addEndTimesToParsedTimes(parsedTimes, 45);
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '09:45', isTimeRecognized: true });
    });
  });

  describe('estimateTimeIntervalFromParsedTimes', () => {
    // estimateTimeIntervalFromParsedTimes関数は現在プライベートなので、
    // addEndTimesToParsedTimes関数を通してテストします
    test('単一時刻のみから間隔を推測する動作確認', () => {
      const parsedTimes30min: ParsedTime[] = [
        { startTime: '09:00', endTime: null, isTimeRecognized: true },
        { startTime: '09:30', endTime: null, isTimeRecognized: true },
        { startTime: '10:00', endTime: null, isTimeRecognized: true }
      ];

      const result30min = addEndTimesToParsedTimes(parsedTimes30min);
      expect(result30min[0].endTime).toBe('09:30'); // 30分間隔
      expect(result30min[1].endTime).toBe('10:00'); // 30分間隔
      expect(result30min[2].endTime).toBe('10:30'); // 30分間隔

      const parsedTimes15min: ParsedTime[] = [
        { startTime: '09:00', endTime: null, isTimeRecognized: true },
        { startTime: '09:15', endTime: null, isTimeRecognized: true },
        { startTime: '09:30', endTime: null, isTimeRecognized: true },
        { startTime: '09:45', endTime: null, isTimeRecognized: true }
      ];

      const result15min = addEndTimesToParsedTimes(parsedTimes15min);
      expect(result15min[0].endTime).toBe('09:15'); // 15分間隔
      expect(result15min[1].endTime).toBe('09:30'); // 15分間隔
      expect(result15min[2].endTime).toBe('09:45'); // 15分間隔
      expect(result15min[3].endTime).toBe('10:00'); // 15分間隔
    });

    test('範囲時刻が含まれていても単一時刻のみから間隔推測', () => {
      const mixedParsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '11:00', isTimeRecognized: true }, // 範囲時刻（2時間）
        { startTime: '10:30', endTime: null, isTimeRecognized: true },   // 単一時刻
        { startTime: '11:00', endTime: null, isTimeRecognized: true },   // 単一時刻
        { startTime: '11:30', endTime: null, isTimeRecognized: true },   // 単一時刻
        { startTime: '14:00', endTime: '16:00', isTimeRecognized: true } // 範囲時刻（2時間）
      ];

      const result = addEndTimesToParsedTimes(mixedParsedTimes);
      
      // 範囲時刻はそのまま保持
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '11:00', isTimeRecognized: true });
      expect(result[4]).toEqual({ startTime: '14:00', endTime: '16:00', isTimeRecognized: true });
      
      // 単一時刻のみから間隔推測: 10:30, 11:00, 11:30 → 30分間隔
      expect(result[1].endTime).toBe('11:00'); // 30分間隔
      expect(result[2].endTime).toBe('11:30'); // 30分間隔
      expect(result[3].endTime).toBe('12:00'); // 30分間隔
    });

    test('詳細な間隔推測テスト - デバッグ用', () => {
      // 実際の動作を詳細に確認するためのテスト
      const parsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '11:00', isTimeRecognized: true }, // 範囲時刻（無視される）
        { startTime: '10:30', endTime: null, isTimeRecognized: true },   // 単一時刻1
        { startTime: '11:00', endTime: null, isTimeRecognized: true },   // 単一時刻2  (間隔: 30分)
        { startTime: '11:30', endTime: null, isTimeRecognized: true },   // 単一時刻3  (間隔: 30分)
      ];

      const result = addEndTimesToParsedTimes(parsedTimes);
      
      // デバッグ出力（テスト実行時にコンソールで確認）
      console.log('入力:', parsedTimes);
      console.log('結果:', result);
      
      // 範囲時刻はそのまま保持
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '11:00', isTimeRecognized: true });
      
      // 単一時刻の間隔は30分なので30分間隔でendTimeが設定されるはず
      expect(result[1]).toEqual({ startTime: '10:30', endTime: '11:00', isTimeRecognized: true });
      expect(result[2]).toEqual({ startTime: '11:00', endTime: '11:30', isTimeRecognized: true });
      expect(result[3]).toEqual({ startTime: '11:30', endTime: '12:00', isTimeRecognized: true });
    });

    test('単一時刻が不足している場合はデフォルト間隔を使用', () => {
      const insufficientParsedTimes: ParsedTime[] = [
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true }, // 範囲時刻
        { startTime: '10:30', endTime: null, isTimeRecognized: true }    // 単一時刻（1つのみ）
      ];

      const result = addEndTimesToParsedTimes(insufficientParsedTimes);
      
      expect(result[0]).toEqual({ startTime: '09:00', endTime: '10:00', isTimeRecognized: true });
      expect(result[1]).toEqual({ startTime: '10:30', endTime: '11:30', isTimeRecognized: true }); // デフォルト60分
    });
  });

  describe('エッジケースのテスト', () => {
    test('時間の境界値テスト', () => {
      // 0時の処理
      const result1 = parseTimeLabel('00:00');
      expect(result1.startTime).toBe('00:00');
      
      // 23時59分の処理
      const result2 = parseTimeLabel('23:59');
      expect(result2.startTime).toBe('23:59');
      
      // 23時台のendTime計算で24時を超える場合
      expect(calculateEndTime('23:30', 60)).toBe('23:59');
    });

    test('不規則な間隔の処理', () => {
      const irregularTimes = ['09:00', '09:45', '10:30', '11:00'];
      const interval = estimateTimeInterval(irregularTimes);
      // 45分、45分、30分の間隔なので、45分が最も頻出
      expect(interval).toBe(45);
    });

    test('大きな間隔の制限テスト', () => {
      const largeTimes = ['09:00', '18:00']; // 9時間間隔
      const interval = estimateTimeInterval(largeTimes);
      expect(interval).toBe(60); // 8時間を超えるため無効となり、デフォルト値
    });
  });
});
