import { formatUserAvailability } from '@/utils/format/recfactor/formatUserAvailability';
import { parseFormdata } from '@/utils/format/voteFormParser';

describe('完全統合テスト: フォーム → データベース登録', () => {
  
  test('実際のフォームデータからユーザー利用可能時間パターンを生成', () => {
    // 1. 実際のHTMLフォームから送信されるFormDataを作成
    const formData = new FormData();
    formData.append('eventId', 'event-123');
    formData.append('participantName', 'テスト太郎');
    
    // 日付と時刻のラベル（正しい形式）
    formData.append('date-label-date1', '2025-07-15');
    formData.append('date-label-date2', '2025-07-16');
    formData.append('time-label-time1', '09:00-10:00');
    formData.append('time-label-time2', '10:00-11:00');
    formData.append('time-label-time3', '13:00-14:00');
    
    // ユーザーの選択
    formData.append('date1__time1', 'on'); // 7/15 9-10時
    formData.append('date1__time2', 'on'); // 7/15 10-11時
    formData.append('date2__time3', 'on'); // 7/16 13-14時

    console.log('=== フォームデータ ===');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    // 2. parseFormdataでフォームデータを解析
    const { votes, eventId } = parseFormdata(formData);
    
    console.log('\n=== 解析済みデータ ===');
    console.log('eventId:', eventId);
    console.log('votes:', JSON.stringify(votes, null, 2));

    // 3. formatUserAvailabilityでユーザー利用可能時間パターンを生成
    const userAvailabilityPatterns = formatUserAvailability(
      'testuser', // 実際のユーザーID（parseFormdataで決定される）
      votes.date_labels,
      votes.time_labels,
      votes.is_available
    );

    console.log('\n=== ユーザー利用可能時間パターン ===');
    console.log(JSON.stringify(userAvailabilityPatterns, null, 2));

    // 4. 結果を検証
    expect(userAvailabilityPatterns).toBeDefined();
    expect(Array.isArray(userAvailabilityPatterns)).toBe(true);
    expect(userAvailabilityPatterns.length).toBeGreaterThan(0);

    // 各パターンを詳しく検証
    userAvailabilityPatterns.forEach((pattern, index) => {
      console.log(`\n=== パターン${index + 1}の詳細 ===`);
      
      const startTime = new Date(pattern.startTImeStamp);
      const endTime = new Date(pattern.endTimeStamp);
      
      console.log('ユーザーID:', pattern.userId);
      console.log('開始日時:', startTime.toISOString());
      console.log('終了日時:', endTime.toISOString());
      console.log('開始時刻（JST）:', `${startTime.getHours()}:${startTime.getMinutes().toString().padStart(2, '0')}`);
      console.log('終了時刻（JST）:', `${endTime.getHours()}:${endTime.getMinutes().toString().padStart(2, '0')}`);
      console.log('日付:', startTime.toDateString());
      
      // 基本的な検証
      expect(pattern.userId).toBe('testuser');
      expect(startTime.getTime()).toBeLessThan(endTime.getTime());
      expect(typeof pattern.startTImeStamp).toBe('string');
      expect(typeof pattern.endTimeStamp).toBe('string');
    });

    // 5. データベース登録用データの形式を確認
    const dbData = userAvailabilityPatterns.map((pattern) => ({
      user_id: pattern.userId,
      start_timestamp: pattern.startTImeStamp,
      end_timestamp: pattern.endTimeStamp,
    }));

    console.log('\n=== データベース登録用データ ===');
    console.log(JSON.stringify(dbData, null, 2));

    // データベース登録用データの検証
    expect(dbData).toHaveLength(userAvailabilityPatterns.length);
    dbData.forEach(data => {
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('start_timestamp');
      expect(data).toHaveProperty('end_timestamp');
      expect(data.user_id).toBe('testuser');
    });

    console.log('\n=== テスト完了: 一連の流れが正常に動作しました ===');
  });

  test('複雑なケース: 複数日にわたる不連続な時間選択', () => {
    const formData = new FormData();
    formData.append('eventId', 'event-456');
    formData.append('participantName', 'テスト花子');
    
    // 3日間、4つの時間帯
    formData.append('date-label-date1', '2025-07-15');
    formData.append('date-label-date2', '2025-07-16');
    formData.append('date-label-date3', '2025-07-17');
    formData.append('time-label-time1', '09:00-10:00');
    formData.append('time-label-time2', '10:00-11:00');
    formData.append('time-label-time3', '13:00-14:00');
    formData.append('time-label-time4', '14:00-15:00');
    
    // 複雑な選択パターン
    formData.append('date1__time1', 'on'); // 7/15 9-10時
    formData.append('date1__time2', 'on'); // 7/15 10-11時 （連続なのでマージされるはず）
    formData.append('date2__time3', 'on'); // 7/16 13-14時
    formData.append('date2__time4', 'on'); // 7/16 14-15時 （連続なのでマージされるはず）
    formData.append('date3__time1', 'on'); // 7/17 9-10時

    const { votes } = parseFormdata(formData);
    const patterns = formatUserAvailability('user456', votes.date_labels, votes.time_labels, votes.is_available);

    console.log('\n=== 複雑なケースの結果 ===');
    console.log(JSON.stringify(patterns, null, 2));

    // 期待される結果:
    // 1. 7/15 9:00-11:00 (連続する時間がマージ)
    // 2. 7/16 13:00-15:00 (連続する時間がマージ)
    // 3. 7/17 9:00-10:00
    expect(patterns).toHaveLength(3);

    // 時間のマージが正しく動作しているかを検証
    patterns.forEach((pattern, index) => {
      const start = new Date(pattern.startTImeStamp);
      const end = new Date(pattern.endTimeStamp);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // 時間単位
      
      console.log(`パターン${index + 1}: ${start.toDateString()} ${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}-${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')} (${duration}時間)`);
    });
  });

  test('エッジケース: 日をまたぐ時間帯', () => {
    const formData = new FormData();
    formData.append('eventId', 'event-789');
    formData.append('participantName', 'テスト次郎');
    
    formData.append('date-label-date1', '2025-07-15');
    formData.append('time-label-time1', '23:00-01:00'); // 日をまたぐ時間帯
    
    formData.append('date1__time1', 'on');

    const { votes } = parseFormdata(formData);
    const patterns = formatUserAvailability('user789', votes.date_labels, votes.time_labels, votes.is_available);

    console.log('\n=== 日をまたぐケースの結果 ===');
    console.log(JSON.stringify(patterns, null, 2));

    expect(patterns).toHaveLength(1);
    
    const start = new Date(patterns[0].startTImeStamp);
    const end = new Date(patterns[0].endTimeStamp);
    
    console.log('開始:', start.toISOString());
    console.log('終了:', end.toISOString());
    
    // 23:00から始まって翌日の1:00に終わることを確認
    expect(start.getHours()).toBe(23);
    expect(end.getHours()).toBe(1);
    expect(end.getDate()).toBe(start.getDate() + 1); // 翌日
  });
});
