import {parseFormdata} from '@/utils/format/voteFormParser';
import { processLabels } from '@/utils/format/labelParser';
import { parseTimeLabel, addEndTimesToParsedTimes } from '@/utils/format/judgeLabel';
import {createClient} from '@/utils/supabase/server';

export async function createUserAvailableRangePattern(formData: FormData) {
    const { votes, eventId } = parseFormdata(formData);
    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('User not authenticated');
    }
    
    // ラベルデータを処理してstart-end形式に変換
    const processedLabels = processLabels({
        date_labels: votes.date_labels,
        time_labels: votes.time_labels,
        is_available: votes.is_available
    });
    
    // 時刻ラベルをParseして間隔を推測
    const parsedTimes = votes.time_labels.map(label => parseTimeLabel(label));
    const processedTimes = addEndTimesToParsedTimes(parsedTimes);
    
    // 可用性パターンを抽出（利用可能な時間範囲のみ）
    const availableRanges: { start_time: string, end_time: string }[] = [];
    
    for (let dateIndex = 0; dateIndex < votes.date_labels.length; dateIndex++) {
        for (let timeIndex = 0; timeIndex < votes.time_labels.length; timeIndex++) {
            if (votes.is_available[dateIndex][timeIndex]) {
                const processedTime = processedTimes[timeIndex];
                if (processedTime.isTimeRecognized && processedTime.startTime && processedTime.endTime) {
                    // 重複チェック
                    const existingRange = availableRanges.find(
                        range => range.start_time === processedTime.startTime && 
                                range.end_time === processedTime.endTime
                    );
                    
                    if (!existingRange) {
                        availableRanges.push({
                            start_time: processedTime.startTime,
                            end_time: processedTime.endTime
                        });
                    }
                }
            }
        }
    }
    
    // データベースに保存
    if (availableRanges.length > 0) {
        const { error: insertError } = await supabase
            .from('user_availability_patterns')
            .upsert(
                availableRanges.map(range => ({
                    user_id: user.id,
                    start_time: range.start_time,
                    end_time: range.end_time,
                    updated_at: new Date().toISOString()
                })),
                { 
                    onConflict: 'user_id,start_time,end_time',
                    ignoreDuplicates: false 
                }
            );
        
        if (insertError) {
            console.error('Error saving user availability pattern:', insertError);
            throw new Error('Failed to save availability pattern');
        }
        
        return {
            success: true,
            message: `${availableRanges.length}件の可用性パターンを保存しました`,
            patterns: availableRanges
        };
    } else {
        return {
            success: true,
            message: '利用可能な時間が選択されていません',
            patterns: []
        };
    }
}