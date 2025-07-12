import { 
  formatUserAvailability,
  formatVotesDataWithTimeRangeGroupedByDate,
  mergeTimeRanges
} from '@/utils/format/recfactor/formatUserAvailability';
import { 
  createTimeRangeFromLabels
} from '@/utils/format/recfactor/labelParser';

describe('デバッグ用詳細テスト', () => {
  
  test('formatUserAvailabilityの各ステップを詳しく確認', () => {
    const user_id = 'testuser';
    const dateLabels = ['2025-07-15'];
    const timeLabels = ['09:00-10:00', '10:00-11:00'];
    const votesData = [
      [true, true]
    ];

    console.log('=== 入力データ ===');
    console.log('dateLabels:', dateLabels);
    console.log('timeLabels:', timeLabels);
    console.log('votesData:', votesData);

    // Step 1: createTimeRangeFromLabels
    console.log('\n=== Step 1: createTimeRangeFromLabels ===');
    const timeRanges = createTimeRangeFromLabels(timeLabels);
    console.log('timeRanges:', JSON.stringify(timeRanges, null, 2));

    // Step 2: formatVotesDataWithTimeRangeGroupedByDate
    console.log('\n=== Step 2: formatVotesDataWithTimeRangeGroupedByDate ===');
    const userVoteData = formatVotesDataWithTimeRangeGroupedByDate(
      dateLabels,
      timeRanges,
      votesData
    );
    console.log('userVoteData:', JSON.stringify(userVoteData, null, 2));

    // Step 3: mergeTimeRanges
    console.log('\n=== Step 3: mergeTimeRanges ===');
    const userAvailability = mergeTimeRanges(userVoteData);
    console.log('userAvailability:', JSON.stringify(userAvailability, null, 2));

    // Step 4: タイムスタンプ生成の詳細
    console.log('\n=== Step 4: タイムスタンプ生成の詳細 ===');
    userAvailability.forEach((vote, voteIndex) => {
      console.log(`vote[${voteIndex}]:`, {
        date: vote.date,
        dateString: vote.date.toISOString(),
        timeRangesCount: vote.time_ranges.length
      });
      
      vote.time_ranges.forEach((timeRange, rangeIndex) => {
        console.log(`  timeRange[${rangeIndex}]:`, timeRange);
        
        // 実際の時刻設定をテスト
        const startDate = new Date(vote.date);
        const endDate = new Date(vote.date);
        
        const [startHour, startMinute] = timeRange.start.split(':').map(Number);
        const [endHour, endMinute] = timeRange.end.split(':').map(Number);
        
        console.log(`    parsed times: ${startHour}:${startMinute} - ${endHour}:${endMinute}`);
        
        startDate.setHours(startHour, startMinute, 0, 0);
        endDate.setHours(endHour, endMinute, 0, 0);
        
        console.log(`    startDate: ${startDate.toISOString()}`);
        console.log(`    endDate: ${endDate.toISOString()}`);
      });
    });

    // 最終結果
    console.log('\n=== 最終結果 ===');
    const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
    console.log('final result:', JSON.stringify(result, null, 2));

    // 検証
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(user_id);
    
    // 時刻が正しく設定されているかチェック
    const startTime = new Date(result[0].startTImeStamp);
    const endTime = new Date(result[0].endTimeStamp);
    
    console.log('\n=== 時刻の検証 ===');
    console.log('開始時刻:', startTime.toISOString());
    console.log('終了時刻:', endTime.toISOString());
    console.log('開始時刻（時分）:', `${startTime.getHours()}:${startTime.getMinutes().toString().padStart(2, '0')}`);
    console.log('終了時刻（時分）:', `${endTime.getHours()}:${endTime.getMinutes().toString().padStart(2, '0')}`);
    
    // 期待される時刻と比較（ローカル時刻、タイムゾーン情報なし）
    expect(startTime.getHours()).toBe(9);
    expect(startTime.getMinutes()).toBe(0);
    expect(endTime.getHours()).toBe(11); // 連続する時間がマージされるはず
    expect(endTime.getMinutes()).toBe(0);
  });

  test('単一時間範囲での動作確認', () => {
    const user_id = 'testuser';
    const dateLabels = ['2025-07-15'];
    const timeLabels = ['09:00-10:00'];
    const votesData = [
      [true]
    ];

    console.log('\n=== 単一時間範囲テスト ===');
    
    const result = formatUserAvailability(user_id, dateLabels, timeLabels, votesData);
    console.log('result:', JSON.stringify(result, null, 2));

    expect(result).toHaveLength(1);
    
    const startTime = new Date(result[0].startTImeStamp);
    const endTime = new Date(result[0].endTimeStamp);
    
    console.log('開始時刻（時分）:', `${startTime.getHours()}:${startTime.getMinutes().toString().padStart(2, '0')}`);
    console.log('終了時刻（時分）:', `${endTime.getHours()}:${endTime.getMinutes().toString().padStart(2, '0')}`);
    
    expect(startTime.getHours()).toBe(9);
    expect(startTime.getMinutes()).toBe(0);
    expect(endTime.getHours()).toBe(10);
    expect(endTime.getMinutes()).toBe(0);
  });
});
