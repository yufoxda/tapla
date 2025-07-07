'use server'
import { createClient } from '@/utils/supabase/server'

// Promise.allを使用した並行データfetch版
export async function fetchEvent(id: string) {
    const supabase = await createClient();
    
    try {
        // 全てのクエリを並行実行
        const [
            { data: event, error: eventError },
            { data: eventDates, error: datesError },
            { data: eventTimes, error: timesError },
            { data: voteStats, error: statsError }
        ] = await Promise.all([
            supabase.from('events').select('*').eq('id', id).single(),
            supabase.from('event_dates').select('*').eq('event_id', id).order('column_order'),
            supabase.from('event_times').select('*').eq('event_id', id).order('row_order'),
            supabase.from('event_vote_statistics').select('*').eq('event_id', id)
        ]);

        // エラーチェック：イベントが見つからない場合（最重要）
        if (eventError) {
            if (eventError.code === 'PGRST116') {
                return { success: false, error: 'Event not found' };
            }
            console.error('Error fetching event:', eventError);
            return { success: false, error: 'Failed to fetch event' };
        }

        // 他のエラーをチェック（致命的エラーのみ処理を停止）
        if (datesError) {
            console.error('Error fetching event dates:', datesError);
            return { success: false, error: 'Failed to fetch event dates' };
        }

        if (timesError) {
            console.error('Error fetching event times:', timesError);
            return { success: false, error: 'Failed to fetch event times' };
        }

        // 投票統計のエラーは非致命的
        if (statsError) {
            console.error('Error fetching vote statistics:', statsError);
        }

        return { 
            success: true, 
            data: {
                event,
                dates: eventDates || [],
                times: eventTimes || [],
                voteStats: voteStats || []
            }
        }
    } catch (error) {
        console.error('Unexpected error in fetchEvent:', error);
        return { success: false, error: 'Unexpected error occurred' };
    }
}
