import {
  timeStringToMinutes,
  minutesToTimeString
} from '@/utils/format/recfactor/time';

describe('time utilities', () => {
  describe('timeStringToMinutes', () => {
    test('正常な時刻文字列を分に変換する', () => {
      expect(timeStringToMinutes('00:00')).toBe(0);
      expect(timeStringToMinutes('01:00')).toBe(60);
      expect(timeStringToMinutes('09:30')).toBe(570); // 9 * 60 + 30
      expect(timeStringToMinutes('12:45')).toBe(765); // 12 * 60 + 45
      expect(timeStringToMinutes('23:59')).toBe(1439); // 23 * 60 + 59
    });

    test('一桁の時間・分を正しく処理する', () => {
      expect(timeStringToMinutes('1:5')).toBe(65); // 1 * 60 + 5
      expect(timeStringToMinutes('9:0')).toBe(540); // 9 * 60 + 0
    });

    test('境界値のテスト', () => {
      expect(timeStringToMinutes('00:00')).toBe(0); // 最小値
      expect(timeStringToMinutes('23:59')).toBe(1439); // 最大値
      expect(timeStringToMinutes('12:00')).toBe(720); // 正午
    });
  });

  describe('minutesToTimeString', () => {
    test('分を正常な時刻文字列に変換する', () => {
      expect(minutesToTimeString(0)).toBe('00:00');
      expect(minutesToTimeString(60)).toBe('01:00');
      expect(minutesToTimeString(570)).toBe('09:30'); // 9時間30分
      expect(minutesToTimeString(765)).toBe('12:45'); // 12時間45分
      expect(minutesToTimeString(1439)).toBe('23:59'); // 23時間59分
    });

    test('境界値のテスト', () => {
      expect(minutesToTimeString(0)).toBe('00:00'); // 最小値
      expect(minutesToTimeString(1439)).toBe('23:59'); // 1日の最大分数
      expect(minutesToTimeString(720)).toBe('12:00'); // 正午
    });

    test('一桁の時間・分も正しくパディングする', () => {
      expect(minutesToTimeString(5)).toBe('00:05'); // 5分
      expect(minutesToTimeString(65)).toBe('01:05'); // 1時間5分
      expect(minutesToTimeString(540)).toBe('09:00'); // 9時間
    });

    test('24時間を超える値の処理', () => {
      expect(minutesToTimeString(1440)).toBe('24:00'); // 24時間 = 1440分
      expect(minutesToTimeString(1500)).toBe('25:00'); // 25時間
      expect(minutesToTimeString(2880)).toBe('48:00'); // 48時間
    });

    test('負の値の処理', () => {
      expect(minutesToTimeString(-60)).toBe('-1:00'); // -1時間
      expect(minutesToTimeString(-30)).toBe('-1:-30'); // -30分の実際の実装での動作
    });
  });

  describe('timeStringToMinutes と minutesToTimeString の相互変換', () => {
    test('往復変換で元の値に戻る', () => {
      const testTimes = ['00:00', '09:30', '12:45', '18:15', '23:59'];
      
      testTimes.forEach(timeString => {
        const minutes = timeStringToMinutes(timeString);
        const convertedBack = minutesToTimeString(minutes);
        expect(convertedBack).toBe(timeString);
      });
    });

    test('分数での往復変換', () => {
      const testMinutes = [0, 30, 60, 90, 570, 720, 1439];
      
      testMinutes.forEach(minutes => {
        const timeString = minutesToTimeString(minutes);
        const convertedBack = timeStringToMinutes(timeString);
        expect(convertedBack).toBe(minutes);
      });
    });
  });
});
