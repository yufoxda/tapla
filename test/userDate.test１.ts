import { isCorrectDate, isCorrectTime, processUserAvailableData, normalizeDate, normalizeTime, timeStringToMinutes, minutesToTimeString, parseDateLabel, parseTimeLabel, mergeTimeRanges, createUserAvailabilityPatternsFromVotes, createUserAvailabilityPatternsFromFormData } from '@/utils/format/userTimes';

describe('userDate', () => {
  describe('isCorrectDate', () => {
    test('正しい日付フォーマットをtrueとして返す', () => {
      // ハイフン区切り
      expect(isCorrectDate('2023-10-01')).toBe(true);
      expect(isCorrectDate('10-01')).toBe(true);
      expect(isCorrectDate('10-1')).toBe(true);
      
      // スラッシュ区切り
      expect(isCorrectDate('2023/10/01')).toBe(true);
      expect(isCorrectDate('10/01')).toBe(true);
      expect(isCorrectDate('10/1')).toBe(true);
      
      // 漢字区切り
      expect(isCorrectDate('2023年10月01日')).toBe(true);
      expect(isCorrectDate('10月01日')).toBe(true);
      expect(isCorrectDate('10月1日')).toBe(true);
      
      // 前後に文字がある場合
      expect(isCorrectDate('渋谷1/1')).toBe(true);
      expect(isCorrectDate('1/1長野')).toBe(true);
      expect(isCorrectDate('1/1~')).toBe(true);
      
      // 全角文字
      expect(isCorrectDate('2023／10／01')).toBe(true);
      expect(isCorrectDate('2023～10～01')).toBe(true);
      expect(isCorrectDate('2023ー10ー01')).toBe(true);

      expect(isCorrectDate('2023.10.01')).toBe(true);
      expect(isCorrectDate('2023_10_01')).toBe(true);
    });

    test('正しくない日付フォーマットをfalseとして返す', () => {
      // 数字のみ
      expect(isCorrectDate('20231001')).toBe(false);
      
      // 区切り文字のみ
      expect(isCorrectDate('---')).toBe(false);
      
      // 文字のみ
      expect(isCorrectDate('abc')).toBe(false);
      
      // 空文字
      expect(isCorrectDate('')).toBe(false);
      
    });
  });

  describe('isCorrectTime', () => {
    test('正しい時刻フォーマットをtrueとして返す', () => {
      expect(isCorrectTime('09:00')).toBe(true);
      expect(isCorrectTime('10:00')).toBe(true);
      expect(isCorrectTime('11:30')).toBe(true);
      expect(isCorrectTime('12:45')).toBe(true);
      expect(isCorrectTime('9:00')).toBe(true);
      expect(isCorrectTime('10:5')).toBe(false); // 分が1桁の場合は無効
      expect(isCorrectTime('1:30')).toBe(true);
      expect(isCorrectTime('23:59')).toBe(true);
      expect(isCorrectTime('00:00')).toBe(true);
    });

    test('正しくない時刻フォーマットをfalseとして返す', () => {
      expect(isCorrectTime('25:00')).toBe(false); // 25時は無効
      expect(isCorrectTime('12:60')).toBe(false); // 60分は無効
      expect(isCorrectTime('abc')).toBe(false);
      expect(isCorrectTime('')).toBe(false);
      expect(isCorrectTime('12')).toBe(false);
      expect(isCorrectTime('12:5')).toBe(false); // 分が1桁
    });
  });

  describe('normalizeDate', () => {
    test('様々な日付形式を標準形式に変換する', () => {
      expect(normalizeDate('2023-10-01')).toBe('2023-10-01');
      expect(normalizeDate('2023/10/01')).toBe('2023-10-01');
      expect(normalizeDate('2023年10月01日')).toBe('2023-10-01');
      expect(normalizeDate('10-01')).toBe('2025-10-01'); // 現在年を使用
      expect(normalizeDate('10/01')).toBe('2025-10-01');
      expect(normalizeDate('10月01日')).toBe('2025-10-01');
    });
  });

  describe('normalizeTime', () => {
    test('時刻を標準形式に変換する', () => {
      expect(normalizeTime('9:00')).toBe('09:00');
      expect(normalizeTime('10:30')).toBe('10:30');
      expect(normalizeTime('1:05')).toBe('01:05');
      expect(normalizeTime('23:59')).toBe('23:59');
    });
  });

  describe('processUserAvailableData', () => {
    test('正しいデータを処理する', () => {
      const formData = {
        date: '2023-10-01',
        startTime: '09:00',
        endTime: '17:00'
      };
      
      const result = processUserAvailableData(formData);
      
      expect(result.success).toBe(true);
      expect(result.date).toBe('2023-10-01');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('17:00');
      expect(result.errors).toBeUndefined();
    });

    test('不正な日付でエラーを返す', () => {
      const formData = {
        date: 'invalid-date',
        startTime: '09:00',
        endTime: '17:00'
      };
      
      const result = processUserAvailableData(formData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('日付の形式が正しくありません');
    });

    test('開始時刻が終了時刻より後の場合エラーを返す', () => {
      const formData = {
        date: '2023-10-01',
        startTime: '17:00',
        endTime: '09:00'
      };
      
      const result = processUserAvailableData(formData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('開始時刻は終了時刻より前である必要があります');
    });

    test('複数のエラーを正しく返す', () => {
      const formData = {
        date: 'invalid',
        startTime: '25:00',
        endTime: '30:00'
      };
      
      const result = processUserAvailableData(formData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        '日付の形式が正しくありません',
        '開始時刻の形式が正しくありません',
        '終了時刻の形式が正しくありません'
      ]);
    });
  });

  describe('timeStringToMinutes', () => {
    test('様々な時刻文字列を分に変換する', () => {
      expect(timeStringToMinutes('09:00:00')).toBe(540); // 9時 = 9*60 = 540分
      expect(timeStringToMinutes('12:30:00')).toBe(750); // 12時30分 = 12*60 + 30 = 750分
      expect(timeStringToMinutes('2023-10-01 09:00:00')).toBe(540);
      expect(timeStringToMinutes('2023-10-01T09:00:00')).toBe(540);
      expect(timeStringToMinutes('23:59:00')).toBe(1439); // 23時59分 = 23*60 + 59 = 1439分
    });

    test('不正な時刻文字列の場合0を返す', () => {
      expect(timeStringToMinutes('')).toBe(0);
      expect(timeStringToMinutes('invalid')).toBe(0);
      expect(timeStringToMinutes('25:00:00')).toBe(0); // NaNになる場合
    });
  });

  describe('minutesToTimeString', () => {
    test('分を時刻文字列に変換する', () => {
      expect(minutesToTimeString(540, '2023-10-01')).toBe('2023-10-01 09:00:00');
      expect(minutesToTimeString(750, '2023-10-01')).toBe('2023-10-01 12:30:00');
      expect(minutesToTimeString(1439, '2023-10-01')).toBe('2023-10-01 23:59:00');
      expect(minutesToTimeString(0, '2023-10-01')).toBe('2023-10-01 00:00:00');
    });
  });

  describe('parseDateLabel', () => {
    test('様々な日付ラベルを解析する', () => {
      const result1 = parseDateLabel('2023-10-01');
      expect(result1.isDateRecognized).toBe(true);
      expect(result1.date?.getFullYear()).toBe(2023);
      expect(result1.date?.getMonth()).toBe(9); // 0から始まる
      expect(result1.date?.getDate()).toBe(1);

      const result2 = parseDateLabel('2023年10月01日');
      expect(result2.isDateRecognized).toBe(true);
      expect(result2.date?.getFullYear()).toBe(2023);

      const result3 = parseDateLabel('10-01');
      expect(result3.isDateRecognized).toBe(true);
      expect(result3.date?.getFullYear()).toBe(2025); // 現在年

      const result4 = parseDateLabel('invalid');
      expect(result4.isDateRecognized).toBe(false);
      expect(result4.date).toBe(null);
    });
  });

  describe('parseTimeLabel', () => {
    test('時刻範囲ラベルを解析する', () => {
      const result1 = parseTimeLabel('09:00-17:00');
      expect(result1.isTimeRecognized).toBe(true);
      expect(result1.startTime).toBe('09:00');
      expect(result1.endTime).toBe('17:00');

      const result2 = parseTimeLabel('9:00~17:00');
      expect(result2.isTimeRecognized).toBe(true);
      expect(result2.startTime).toBe('09:00');
      expect(result2.endTime).toBe('17:00');

      const result3 = parseTimeLabel('09:00 - 17:00');
      expect(result3.isTimeRecognized).toBe(true);
      expect(result3.startTime).toBe('09:00');
      expect(result3.endTime).toBe('17:00');
    });

    test('単一時刻ラベルを解析する', () => {
      const result1 = parseTimeLabel('09:00');
      expect(result1.isTimeRecognized).toBe(true);
      expect(result1.startTime).toBe('09:00');
      expect(result1.endTime).toBe(null);

      const result2 = parseTimeLabel('9:30');
      expect(result2.isTimeRecognized).toBe(true);
      expect(result2.startTime).toBe('09:30');
      expect(result2.endTime).toBe(null);
    });

    test('不正な時刻ラベルの場合', () => {
      const result = parseTimeLabel('invalid');
      expect(result.isTimeRecognized).toBe(false);
      expect(result.startTime).toBe(null);
      expect(result.endTime).toBe(null);
    });
  });

  describe('mergeTimeRanges', () => {
    test('重複する時間範囲を結合する', () => {
      const ranges = [
        { start: 540, end: 600 },  // 9:00-10:00
        { start: 600, end: 720 },  // 10:00-12:00
        { start: 780, end: 840 }   // 13:00-14:00
      ];
      
      const merged = mergeTimeRanges(ranges);
      expect(merged).toEqual([
        { start: 540, end: 720 },  // 9:00-12:00 (結合)
        { start: 780, end: 840 }   // 13:00-14:00 (独立)
      ]);
    });

    test('空の配列の場合空配列を返す', () => {
      expect(mergeTimeRanges([])).toEqual([]);
    });

    test('単一の範囲の場合そのまま返す', () => {
      const ranges = [{ start: 540, end: 600 }];
      expect(mergeTimeRanges(ranges)).toEqual(ranges);
    });
  });

  describe('createUserAvailabilityPatternsFromVotes', () => {
    test('投票データから時間範囲を結合してパターンを作成する', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'time2', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'time3', isAvailable: false },
        { eventDateId: 'date1', eventTimeId: 'time4', isAvailable: true },
        { eventDateId: 'date2', eventTimeId: 'time5', isAvailable: true },
      ];

      const dateLabels = new Map([
        ['date1', '2024/11/1'],
        ['date2', '2024/11/2']
      ]);

      const timeLabels = new Map([
        ['time1', '11:00'],
        ['time2', '12:00'],
        ['time3', '13:00'],
        ['time4', '14:00'],
        ['time5', '15:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);

      expect(patterns).toHaveLength(3);
      
      // 2024/11/1の結合されたパターン
      expect(patterns[0].start_time).toBe('2024-11-01 11:00:00');
      expect(patterns[0].end_time).toBe('2024-11-01 13:00:00'); // 11:00-12:00が結合
      expect(patterns[1].start_time).toBe('2024-11-01 14:00:00');
      expect(patterns[1].end_time).toBe('2024-11-01 15:00:00'); // 14:00単体

      // 2024/11/2のパターン
      expect(patterns[2].start_time).toBe('2024-11-02 15:00:00');
      expect(patterns[2].end_time).toBe('2024-11-02 16:00:00'); // 15:00単体
    });

    test('時刻範囲が指定されている場合の処理', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'time2', isAvailable: true },
      ];

      const dateLabels = new Map([
        ['date1', '2024/11/1']
      ]);

      const timeLabels = new Map([
        ['time1', '09:00-11:00'],
        ['time2', '11:00-13:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].start_time).toBe('2024-11-01 09:00:00');
      expect(patterns[0].end_time).toBe('2024-11-01 13:00:00'); // 09:00-11:00と11:00-13:00が結合
    });

    test('利用不可の投票は無視される', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: false },
        { eventDateId: 'date1', eventTimeId: 'time2', isAvailable: true },
      ];

      const dateLabels = new Map([
        ['date1', '2024/11/1']
      ]);

      const timeLabels = new Map([
        ['time1', '09:00'],
        ['time2', '10:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].start_time).toBe('2024-11-01 10:00:00');
      expect(patterns[0].end_time).toBe('2024-11-01 11:00:00');
    });

    test('不正な日付ラベルは無視される', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: true },
        { eventDateId: 'date2', eventTimeId: 'time2', isAvailable: true },
      ];

      const dateLabels = new Map([
        ['date1', '2024/11/1'],
        ['date2', 'invalid-date']
      ]);

      const timeLabels = new Map([
        ['time1', '09:00'],
        ['time2', '10:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].start_time).toBe('2024-11-01 09:00:00');
    });

    test('不正な時刻ラベルは無視される', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'time2', isAvailable: true },
      ];

      const dateLabels = new Map([
        ['date1', '2024/11/1']
      ]);

      const timeLabels = new Map([
        ['time1', '09:00'],
        ['time2', 'invalid-time']
      ]);

      const patterns = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].start_time).toBe('2024-11-01 09:00:00');
    });

    test('空の投票配列の場合空配列を返す', () => {
      const patterns = createUserAvailabilityPatternsFromVotes([], new Map(), new Map());
      expect(patterns).toEqual([]);
    });
  });

  describe('createUserAvailabilityPatternsFromFormData', () => {
    test('FormDataから投票データを抽出してパターンを作成する', () => {
      const formData = new FormData();
      formData.append('date1__time1', 'on');
      formData.append('date1__time2', 'on');
      formData.append('date1__time3', 'off'); // このチェックボックスは選択されていない
      formData.append('date1__time4', 'on');
      formData.append('other-field', 'value');

      const dateLabels = new Map([
        ['date1', '2024/11/1']
      ]);

      const timeLabels = new Map([
        ['time1', '11:00'],
        ['time2', '12:00'],
        ['time3', '13:00'],
        ['time4', '14:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromFormData(
        formData,
        'user123',
        dateLabels,
        timeLabels
      );

      expect(patterns).toHaveLength(2);
      
      // user_idが正しく設定されているかチェック
      expect(patterns[0].user_id).toBe('user123');
      expect(patterns[1].user_id).toBe('user123');

      // 時間範囲が正しく結合されているかチェック
      expect(patterns[0].start_time).toBe('2024-11-01 11:00:00');
      expect(patterns[0].end_time).toBe('2024-11-01 13:00:00'); // 11:00-12:00が結合
      expect(patterns[1].start_time).toBe('2024-11-01 14:00:00');
      expect(patterns[1].end_time).toBe('2024-11-01 15:00:00'); // 14:00単体
    });

    test('複数の日付にまたがる投票の処理', () => {
      const formData = new FormData();
      formData.append('date1__time1', 'on');
      formData.append('date1__time2', 'on');
      formData.append('date2__time3', 'on');
      formData.append('date2__time4', 'on');

      const dateLabels = new Map([
        ['date1', '2024/11/1'],
        ['date2', '2024/11/2']
      ]);

      const timeLabels = new Map([
        ['time1', '09:00'],
        ['time2', '10:00'],
        ['time3', '14:00'],
        ['time4', '15:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromFormData(
        formData,
        'user123',
        dateLabels,
        timeLabels
      );

      expect(patterns).toHaveLength(2);
      
      // 日付ごとに結合されているかチェック
      expect(patterns[0].start_time).toBe('2024-11-01 09:00:00');
      expect(patterns[0].end_time).toBe('2024-11-01 11:00:00');
      expect(patterns[1].start_time).toBe('2024-11-02 14:00:00');
      expect(patterns[1].end_time).toBe('2024-11-02 16:00:00');
    });

    test('選択されていないチェックボックスは無視される', () => {
      const formData = new FormData();
      formData.append('date1__time1', 'off');
      formData.append('date1__time2', 'on');
      formData.append('other-field', 'value');

      const dateLabels = new Map([
        ['date1', '2024/11/1']
      ]);

      const timeLabels = new Map([
        ['time1', '09:00'],
        ['time2', '10:00']
      ]);

      const patterns = createUserAvailabilityPatternsFromFormData(
        formData,
        'user123',
        dateLabels,
        timeLabels
      );

      expect(patterns).toHaveLength(1);
      expect(patterns[0].start_time).toBe('2024-11-01 10:00:00');
    });

    test('空のFormDataの場合空配列を返す', () => {
      const formData = new FormData();
      const patterns = createUserAvailabilityPatternsFromFormData(
        formData,
        'user123',
        new Map(),
        new Map()
      );
      expect(patterns).toEqual([]);
    });
  });
});
