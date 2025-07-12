import { parseFormdata } from '@/utils/format/voteFormParser';

describe('parseFormdata関数テスト', () => {
  
  test('基本的なFormDataの解析', () => {
    const formData = new FormData();
    
    formData.append('eventId', 'event-123');
    formData.append('participantName', 'テストユーザー');
    
    // date-label-形式とtime-label-形式でラベルを追加
    formData.append('date-label-date1', '2025-07-15');
    formData.append('date-label-date2', '2025-07-16'); 
    formData.append('time-label-time1', '09:00-10:00');
    formData.append('time-label-time2', '10:00-11:00');
    
    // チェックボックスの選択
    formData.append('date1__time1', 'on');
    formData.append('date2__time2', 'on');

    const { votes, eventId } = parseFormdata(formData);
    
    console.log('=== 基本テストの結果 ===');
    console.log('eventId:', eventId);
    console.log('votes:', JSON.stringify(votes, null, 2));

    // 基本的な検証
    expect(eventId).toBe('event-123');
    expect(votes.date_ids).toEqual(['date1', 'date2']);
    expect(votes.date_labels).toEqual(['2025-07-15', '2025-07-16']);
    expect(votes.time_ids).toEqual(['time1', 'time2']);
    expect(votes.time_labels).toEqual(['09:00-10:00', '10:00-11:00']);
    expect(votes.is_available).toEqual([
      [true, false],   // date1: time1○, time2×
      [false, true]    // date2: time1×, time2○
    ]);
  });

  test('UUID形式のIDでも正しく動作する', () => {
    const formData = new FormData();
    
    formData.append('eventId', 'event-uuid-123');
    
    // UUID形式のID
    const dateUuid1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const dateUuid2 = 'b2c3d4e5-f6g7-8901-bcde-f12345678901';
    const timeUuid1 = 'z9y8x7w6-v5u4-3210-fedc-ba9876543210';
    const timeUuid2 = 'y8x7w6v5-u4t3-2109-edcb-a98765432109';
    
    formData.append(`date-label-${dateUuid1}`, '2025-07-15');
    formData.append(`date-label-${dateUuid2}`, '2025-07-16');
    formData.append(`time-label-${timeUuid1}`, '09:00-10:00');
    formData.append(`time-label-${timeUuid2}`, '10:00-11:00');
    
    // チェックボックスの選択
    formData.append(`${dateUuid1}__${timeUuid1}`, 'on');
    formData.append(`${dateUuid2}__${timeUuid2}`, 'on');

    const { votes, eventId } = parseFormdata(formData);
    
    console.log('=== UUID形式テストの結果 ===');
    console.log('eventId:', eventId);
    console.log('votes:', JSON.stringify(votes, null, 2));

    expect(eventId).toBe('event-uuid-123');
    expect(votes.date_ids).toEqual([dateUuid1, dateUuid2]);
    expect(votes.date_labels).toEqual(['2025-07-15', '2025-07-16']);
    expect(votes.time_ids).toEqual([timeUuid1, timeUuid2]);
    expect(votes.time_labels).toEqual(['09:00-10:00', '10:00-11:00']);
    expect(votes.is_available).toEqual([
      [true, false],   // date1: time1○, time2×
      [false, true]    // date2: time1×, time2○
    ]);
  });

  test('eventIdが無い場合はエラーが発生する', () => {
    const formData = new FormData();
    
    formData.append('date-label-date1', '2025-07-15');
    formData.append('time-label-time1', '09:00-10:00');
    // eventIdを設定しない

    expect(() => {
      parseFormdata(formData);
    }).toThrow('Event ID is required');
  });

  test('ラベルが無い場合は空の配列を返す', () => {
    const formData = new FormData();
    
    formData.append('eventId', 'event-123');
    // ラベルを設定しない

    const { votes, eventId } = parseFormdata(formData);
    
    expect(eventId).toBe('event-123');
    expect(votes.date_ids).toEqual([]);
    expect(votes.date_labels).toEqual([]);
    expect(votes.time_ids).toEqual([]);
    expect(votes.time_labels).toEqual([]);
    expect(votes.is_available).toEqual([]);
  });

  test('日付と時刻を正しく分類する', () => {
    const formData = new FormData();
    
    formData.append('eventId', 'test-123');
    
    // 様々なラベル形式をテスト
    formData.append('date-label-id1', '2025-07-15');
    formData.append('date-label-id2', '7月16日');
    formData.append('date-label-id3', '月曜日');
    formData.append('time-label-id4', '09:00-10:00');
    formData.append('time-label-id5', '午前');
    formData.append('time-label-id6', '18:00~渋谷1');
    
    // チェックボックスの選択もテスト
    formData.append('id1__id4', 'on');
    formData.append('id2__id5', 'on');

    const { votes } = parseFormdata(formData);

    console.log('=== 分類テストの結果 ===');
    console.log('votes:', JSON.stringify(votes, null, 2));

    // 日付として分類されるもの
    expect(votes.date_ids).toEqual(['id1', 'id2', 'id3']);
    expect(votes.date_labels).toEqual(['2025-07-15', '7月16日', '月曜日']);
    
    // 時刻として分類されるもの
    expect(votes.time_ids).toEqual(['id4', 'id5', 'id6']);
    expect(votes.time_labels).toEqual(['09:00-10:00', '午前', '18:00~渋谷1']);
    
    // is_availableマトリックス（3日付 × 3時刻）
    expect(votes.is_available).toEqual([
      [true, false, false],   // id1: id4○, id5×, id6×
      [false, true, false],   // id2: id4×, id5○, id6×
      [false, false, false]   // id3: id4×, id5×, id6×
    ]);
  });
});
