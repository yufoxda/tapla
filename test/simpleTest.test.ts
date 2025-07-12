import { 
  formatUserAvailability,
  formatVotesDataWithTimeRangeGroupedByDate,
  mergeTimeRanges
} from '@/utils/format/recfactor/formatUserAvailability';
import { 
  parseDateLabel, 
  parseTimeLabel 
} from '@/utils/format/recfactor/judgeLabel';
import { 
  createTimeRangeFromLabels,
  calculateEndTime
} from '@/utils/format/recfactor/labelParser';
import { 
  timeStringToMinutes, 
  minutesToTimeString 
} from '@/utils/format/recfactor/time';

describe('簡単な動作確認テスト', () => {
  
  describe('基本的な関数のテスト', () => {
    test('timeStringToMinutes と minutesToTimeString の基本動作', () => {
      // 9:30 = 9*60 + 30 = 570分
      expect(timeStringToMinutes('09:30')).toBe(570);
      expect(minutesToTimeString(570)).toBe('09:30');
      
      // 0:00
      expect(timeStringToMinutes('00:00')).toBe(0);
      expect(minutesToTimeString(0)).toBe('00:00');
    });

    test('calculateEndTime の基本動作', () => {
      // 9:00 + 60分 = 10:00
      expect(calculateEndTime('09:00', 60)).toBe('10:00');
      
      // 9:30 + 90分 = 11:00
      expect(calculateEndTime('09:30', 90)).toBe('11:00');
    });

    test('parseDateLabel の基本動作', () => {
      const result1 = parseDateLabel('2025-07-15');
      expect(result1.isDateRecognized).toBe(true);
      expect(result1.date).toEqual(new Date(2025, 6, 15)); // 月は0から始まる

      const result2 = parseDateLabel('invalid');
      expect(result2.isDateRecognized).toBe(false);
      expect(result2.date).toBeNull();
    });

    test('parseTimeLabel の基本動作', () => {
      // 時間範囲の解析
      const result1 = parseTimeLabel('09:00-10:00');
      expect(result1.isTimeRecognized).toBe(true);
      expect(result1.startTime).toBe('09:00');
      expect(result1.endTime).toBe('10:00');

      // 単一時刻の解析
      const result2 = parseTimeLabel('09:00');
      expect(result2.isTimeRecognized).toBe(true);
      expect(result2.startTime).toBe('09:00');
      expect(result2.endTime).toBeNull();

      // 無効な時刻
      const result3 = parseTimeLabel('invalid');
      expect(result3.isTimeRecognized).toBe(false);
      expect(result3.startTime).toBeNull();
      expect(result3.endTime).toBeNull();
    });
  });

  describe('時間範囲作成のテスト', () => {
    test('createTimeRangeFromLabels の基本動作', () => {
      const timeLabels = ['09:00-10:00', '10:00-11:00', '13:00'];
      
      const result = createTimeRangeFromLabels(timeLabels);
      
      expect(result).toHaveLength(3);
      
      // 範囲指定の時刻
      expect(result[0]).toEqual({
        start: '09:00',
        end: '10:00',
        is_recognized: true
      });
      
      // 単一時刻（自動で終了時刻が追加される）
      expect(result[2]).toEqual({
        start: '13:00',
        end: '14:00', // デフォルト1時間後
        is_recognized: true
      });
    });
  });

  describe('統合テスト（小規模）', () => {
    test('簡単なケースでの一連の流れ', () => {
      const user_id = 'testuser';
      const dateLabels = ['2025-07-15'];
      const timeLabels = ['09:00-10:00', '10:00-11:00'];
      const votesData = [
        [true, true] // 両方選択
      ];

      console.log('入力データ:');
      console.log('dateLabels:', dateLabels);
      console.log('timeLabels:', timeLabels);
      console.log('votesData:', votesData);

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
      
      console.log('結果:');
      console.log(JSON.stringify(result, null, 2));

      // 基本的な検証
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('userId');
        expect(result[0]).toHaveProperty('startTImeStamp');
        expect(result[0]).toHaveProperty('endTimeStamp');
        expect(result[0].userId).toBe(user_id);
      }
    });

    test('利用可能時間がない場合', () => {
      const user_id = 'testuser';
      const dateLabels = ['2025-07-15'];
      const timeLabels = ['09:00-10:00', '10:00-11:00'];
      const votesData = [
        [false, false] // 何も選択しない
      ];

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
      
      console.log('利用可能時間なしの結果:', result);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // 利用可能時間がないので空配列
    });

    test('複数日で一部選択した場合', () => {
      const user_id = 'testuser';
      const dateLabels = ['2025-07-15', '2025-07-16'];
      const timeLabels = ['09:00-10:00', '10:00-11:00'];
      const votesData = [
        [true, false],  // 7/15は9-10のみ
        [false, true]   // 7/16は10-11のみ
      ];

      const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
      
      console.log('複数日の結果:', JSON.stringify(result, null, 2));
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // 各結果の日付が異なることを確認
      if (result.length >= 2) {
        const date1 = new Date(result[0].startTImeStamp).getDate();
        const date2 = new Date(result[1].startTImeStamp).getDate();
        expect(date1).not.toBe(date2);
      }
    });
  });

  describe('フォームデータ形式のテスト', () => {
    test('実際のページフォームを想定したデータ構造', () => {
      // 実際のHTMLフォームから来るであろうデータ
      const formDataExample = {
        eventId: 'event123',
        participantName: 'テストユーザー',
        
        // 日付ラベル（hidden input）
        'date-label-date1': '2025-07-15',
        'date-label-date2': '2025-07-16',
        
        // 時刻ラベル（hidden input）
        'time-label-time1': '09:00-10:00',
        'time-label-time2': '10:00-11:00',
        'time-label-time3': '11:00-12:00',
        
        // チェックボックス（選択された項目のみ）
        'date1__time1': 'on', // 7/15 9-10時
        'date1__time2': 'on', // 7/15 10-11時
        'date2__time3': 'on'  // 7/16 11-12時
      };

      console.log('想定フォームデータ:', formDataExample);

      // parseFormdataでどのように解析されるべきかの想定
      const expectedParsedData = {
        votes: {
          date_ids: ['date1', 'date2'],
          date_labels: ['2025-07-15', '2025-07-16'],
          time_ids: ['time1', 'time2', 'time3'],
          time_labels: ['09:00-10:00', '10:00-11:00', '11:00-12:00'],
          is_available: [
            [true, true, false],   // date1: time1=○, time2=○, time3=×
            [false, false, true]   // date2: time1=×, time2=×, time3=○
          ]
        },
        eventId: 'event123'
      };

      console.log('想定解析結果:', JSON.stringify(expectedParsedData, null, 2));

      // この想定データでformatUserAvailabilityを呼んだ場合の結果
      const result = formatUserAvailability(
        'testuser', // user_id (実際はparseFormdataで生成)
        expectedParsedData.votes.date_labels,
        expectedParsedData.votes.time_labels,
        expectedParsedData.votes.is_available
      );

      console.log('最終的なユーザー利用可能時間:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
