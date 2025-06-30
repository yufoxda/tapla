'use server'
import { createClient } from '@/utils/supabase/server'

export async function fetchEvent(id: string) {
    const supabase = await createClient();
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
    if (eventError) {
      if (eventError.code === 'PGRST116') {
        return { success: false, error: 'Event not found' };
      }
      console.error('Error fetching event:', eventError);
      return { success: false, error: 'Failed to fetch event' };
    }

    // 2. 候補日を取得
    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .select('*')
      .eq('event_id', id)
      .order('column_order');

    if (datesError) {
      console.error('Error fetching event dates:', datesError);
      return { success: false, error: 'Failed to fetch event dates' };
    }

    // 3. 候補時刻を取得
    const { data: eventTimes, error: timesError } = await supabase
      .from('event_times')
      .select('*')
      .eq('event_id', id)
      .order('row_order');

    if (timesError) {
      console.error('Error fetching event times:', timesError);
      return { success: false, error: 'Failed to fetch event times' };
    }

    // 4. 投票統計を取得（マテリアライズドビューから）
    const { data: voteStats, error: statsError } = await supabase
      .from('event_vote_statistics')
      .select('*')
      .eq('event_id', id);

    if (statsError) {
      console.error('Error fetching vote statistics:', statsError);
      // 投票統計の取得エラーは致命的でないため、空配列を使用
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
}
