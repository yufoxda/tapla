import { timeStringToMinutes, minutesToTimeString, parseDateLabel, parseTimeLabel, mergeTimeRanges, createUserAvailabilityPatternsFromVotes, createUserAvailabilityPatternsFromFormData } from '@/utils/format/userTimes';

describe('userDate', () => {
  describe('timeStringToMinutes', () => {
    test('様々な時刻文字列を分に変換する', () => {
      expect(timeStringToMinutes('09:00:00')).toBe(540); // 9時 = 9*60 = 540分
      expect(timeStringToMinutes('12:30:00')).toBe(750); // 12時30分 = 12*60 + 30 = 750分
      expect(timeStringToMinutes('2023-10-01 09:00:00')).toBe(540);
      expect(timeStringToMinutes('2023-10-01T09:00:00')).toBe(540);
      expect(timeStringToMinutes('00:00:00')).toBe(0);
      expect(timeStringToMinutes('23:59:00')).toBe(1439);
    });

    test('無効な入力に対してwarningを出し0を返す', () => {
      expect(timeStringToMinutes('')).toBe(0);
      expect(timeStringToMinutes('invalid')).toBe(0);
      expect(timeStringToMinutes('25:00:00')).toBe(0); // 25時は無効
      expect(timeStringToMinutes('12:60:00')).toBe(0); // 60分は無効
    });
  });

  describe('minutesToTimeString', () => {
    test('分を時刻文字列に変換する', () => {
      expect(minutesToTimeString(540, '2023-10-01')).toBe('2023-10-01 09:00:00');
      expect(minutesToTimeString(750, '2023-10-01')).toBe('2023-10-01 12:30:00');
      expect(minutesToTimeString(0, '2023-10-01')).toBe('2023-10-01 00:00:00');
      expect(minutesToTimeString(1439, '2023-10-01')).toBe('2023-10-01 23:59:00');
    });
  });

  describe('parseDateLabel', () => {
    test('様々な日付形式を解析する', () => {
      // YYYY-MM-DD形式
      const result1 = parseDateLabel('2023-10-01');
      expect(result1.isDateRecognized).toBe(true);
      expect(result1.date?.getFullYear()).toBe(2023);
      expect(result1.date?.getMonth()).toBe(9); // 10月は9（月は0から始まる）
      expect(result1.date?.getDate()).toBe(1);

      // YYYY/MM/DD形式
      const result2 = parseDateLabel('2023/10/01');
      expect(result2.isDateRecognized).toBe(true);
      expect(result2.date?.getFullYear()).toBe(2023);

      // 年月日形式
      const result3 = parseDateLabel('2023年10月01日');
      expect(result3.isDateRecognized).toBe(true);
      expect(result3.date?.getFullYear()).toBe(2023);

      // MM-DD形式（現在年を使用）
      const result4 = parseDateLabel('10-01');
      expect(result4.isDateRecognized).toBe(true);
      expect(result4.date?.getFullYear()).toBe(new Date().getFullYear());
    });

    test('無効な日付文字列を処理する', () => {
      const result1 = parseDateLabel('');
      expect(result1.isDateRecognized).toBe(false);
      expect(result1.date).toBeNull();

      const result2 = parseDateLabel('invalid-date');
      expect(result2.isDateRecognized).toBe(false);
      expect(result2.date).toBeNull();
    });
  });

  describe('parseTimeLabel', () => {
    test('時刻範囲を解析する', () => {
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

    test('単一時刻を解析する', () => {
      const result1 = parseTimeLabel('09:00');
      expect(result1.isTimeRecognized).toBe(true);
      expect(result1.startTime).toBe('09:00');
      expect(result1.endTime).toBeNull();

      const result2 = parseTimeLabel('9:00');
      expect(result2.isTimeRecognized).toBe(true);
      expect(result2.startTime).toBe('09:00');
      expect(result2.endTime).toBeNull();
    });

    test('無効な時刻を処理する', () => {
      const result1 = parseTimeLabel('');
      expect(result1.isTimeRecognized).toBe(false);

      const result2 = parseTimeLabel('25:00-26:00'); // 無効な時刻
      expect(result2.isTimeRecognized).toBe(false);

      const result3 = parseTimeLabel('12:60'); // 無効な分
      expect(result3.isTimeRecognized).toBe(false);

      const result4 = parseTimeLabel('invalid');
      expect(result4.isTimeRecognized).toBe(false);
    });
  });

  describe('mergeTimeRanges', () => {
    test('重複する時間範囲を結合する', () => {
      const ranges = [
        { start: 540, end: 600 }, // 9:00-10:00
        { start: 580, end: 640 }, // 9:40-10:40 (重複)
      ];
      const result = mergeTimeRanges(ranges);
      expect(result).toEqual([{ start: 540, end: 640 }]);
    });

    test('隣接する時間範囲を結合する', () => {
      const ranges = [
        { start: 540, end: 600 }, // 9:00-10:00
        { start: 600, end: 660 }, // 10:00-11:00 (隣接)
      ];
      const result = mergeTimeRanges(ranges);
      expect(result).toEqual([{ start: 540, end: 660 }]);
    });

    test('分離された時間範囲をそのまま返す', () => {
      const ranges = [
        { start: 540, end: 600 }, // 9:00-10:00
        { start: 720, end: 780 }, // 12:00-13:00 (分離)
      ];
      const result = mergeTimeRanges(ranges);
      expect(result).toEqual([
        { start: 540, end: 600 },
        { start: 720, end: 780 }
      ]);
    });

    test('順序がバラバラの時間範囲を正しく処理する', () => {
      const ranges = [
        { start: 720, end: 780 }, // 12:00-13:00
        { start: 540, end: 600 }, // 9:00-10:00
        { start: 580, end: 640 }, // 9:40-10:40
      ];
      const result = mergeTimeRanges(ranges);
      expect(result).toEqual([
        { start: 540, end: 640 },
        { start: 720, end: 780 }
      ]);
    });

    test('空の配列を処理する', () => {
      const result = mergeTimeRanges([]);
      expect(result).toEqual([]);
    });
  });

  describe('createUserAvailabilityPatternsFromVotes', () => {
    test('投票データから可用性パターンを作成する', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'time2', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'time3', isAvailable: false },
        { eventDateId: 'date2', eventTimeId: 'time1', isAvailable: true },
      ];

      const dateLabels = new Map([
        ['date1', '2023-10-01'],
        ['date2', '2023-10-02'],
      ]);

      const timeLabels = new Map([
        ['time1', '09:00-10:00'],
        ['time2', '10:00-11:00'],
        ['time3', '14:00-15:00'],
      ]);

      const result = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);

      expect(result).toHaveLength(2);
      
      // 2023-10-01の結合されたパターン（9:00-11:00）
      expect(result[0]).toEqual({
        user_id: '',
        start_time: '2023-10-01 09:00:00',
        end_time: '2023-10-01 11:00:00'
      });

      // 2023-10-02のパターン（9:00-10:00）
      expect(result[1]).toEqual({
        user_id: '',
        start_time: '2023-10-02 09:00:00',
        end_time: '2023-10-02 10:00:00'
      });
    });

    test('利用不可能な投票を除外する', () => {
      const votes = [
        { eventDateId: 'date1', eventTimeId: 'time1', isAvailable: false },
        { eventDateId: 'date1', eventTimeId: 'time2', isAvailable: false },
      ];

      const dateLabels = new Map([['date1', '2023-10-01']]);
      const timeLabels = new Map([
        ['time1', '09:00-10:00'],
        ['time2', '10:00-11:00'],
      ]);

      const result = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);
      expect(result).toHaveLength(0);
    });

    test('不正な日付・時刻ラベルを処理する', () => {
      const votes = [
        { eventDateId: 'invalid-date', eventTimeId: 'time1', isAvailable: true },
        { eventDateId: 'date1', eventTimeId: 'invalid-time', isAvailable: true },
      ];

      const dateLabels = new Map([['date1', '2023-10-01']]);
      const timeLabels = new Map([['time1', '09:00-10:00']]);

      const result = createUserAvailabilityPatternsFromVotes(votes, dateLabels, timeLabels);
      expect(result).toHaveLength(0);
    });
  });

  describe('createUserAvailabilityPatternsFromFormData', () => {
    test('FormDataから可用性パターンを作成する', () => {
      const formData = new FormData();
      formData.set('date1__time1', 'on');
      formData.set('date1__time2', 'on');
      formData.set('date2__time1', 'on');
      formData.set('other-field', 'value');

      const userId = 'user123';
      const dateLabels = new Map([
        ['date1', '2023-10-01'],
        ['date2', '2023-10-02'],
      ]);

      const timeLabels = new Map([
        ['time1', '09:00-10:00'],
        ['time2', '10:00-11:00'],
      ]);

      const result = createUserAvailabilityPatternsFromFormData(formData, userId, dateLabels, timeLabels);

      expect(result).toHaveLength(2);
      
      expect(result[0]).toEqual({
        user_id: 'user123',
        start_time: '2023-10-01 09:00:00',
        end_time: '2023-10-01 11:00:00'
      });

      expect(result[1]).toEqual({
        user_id: 'user123',
        start_time: '2023-10-02 09:00:00',
        end_time: '2023-10-02 10:00:00'
      });
    });

    test('空のFormDataを処理する', () => {
      const formData = new FormData();
      const userId = 'user123';
      const dateLabels = new Map();
      const timeLabels = new Map();

      const result = createUserAvailabilityPatternsFromFormData(formData, userId, dateLabels, timeLabels);
      expect(result).toHaveLength(0);
    });
  });
});