'use server'
import { createClient } from '@/utils/supabase/server'

// 従来の実装
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


// 検討中
// // 代替実装：JOINを使用した効率的なデータ取得
// export async function fetchEventOptimized(id: string) {
//     const supabase = await createClient();
    
//     // 1回のクエリで関連データを全て取得
//     const { data, error } = await supabase
//         .from('events')
//         .select(`
//             *,
//             event_dates(*),
//             event_times(*),
//             event_vote_statistics(*)
//         `)
//         .eq('id', id)
//         .single();

//     if (error) {
//         if (error.code === 'PGRST116') {
//             return { success: false, error: 'Event not found' };
//         }
//         console.error('Error fetching event with relations:', error);
//         return { success: false, error: 'Failed to fetch event' };
//     }

//     // データを整形
//     const sortedDates = data.event_dates?.sort((a: any, b: any) => a.column_order - b.column_order) || [];
//     const sortedTimes = data.event_times?.sort((a: any, b: any) => a.row_order - b.row_order) || [];

//     return {
//         success: true,
//         data: {
//             event: {
//                 id: data.id,
//                 title: data.title,
//                 description: data.description,
//                 // 他のイベントフィールド
//             },
//             dates: sortedDates,
//             times: sortedTimes,
//             voteStats: data.event_vote_statistics || []
//         }
//     };
// }

// // 並行データfetch版：Promise.allを使用
// export async function fetchEventParallel(id: string) {
//     const supabase = await createClient();
    
//     try {
//         // 全てのクエリを並行実行
//         const [
//             { data: event, error: eventError },
//             { data: eventDates, error: datesError },
//             { data: eventTimes, error: timesError },
//             { data: voteStats, error: statsError }
//         ] = await Promise.all([
//             supabase.from('events').select('*').eq('id', id).single(),
//             supabase.from('event_dates').select('*').eq('event_id', id).order('column_order'),
//             supabase.from('event_times').select('*').eq('event_id', id).order('row_order'),
//             supabase.from('event_vote_statistics').select('*').eq('event_id', id)
//         ]);

//         // エラーチェック：イベントが見つからない場合（最重要）
//         if (eventError) {
//             if (eventError.code === 'PGRST116') {
//                 return { success: false, error: 'Event not found' };
//             }
//             console.error('Error fetching event:', eventError);
//             return { success: false, error: 'Failed to fetch event' };
//         }

//         // 他のエラーをチェック（致命的エラーのみ処理を停止）
//         if (datesError) {
//             console.error('Error fetching event dates:', datesError);
//             return { success: false, error: 'Failed to fetch event dates' };
//         }

//         if (timesError) {
//             console.error('Error fetching event times:', timesError);
//             return { success: false, error: 'Failed to fetch event times' };
//         }

//         // 投票統計のエラーは非致命的
//         if (statsError) {
//             console.error('Error fetching vote statistics:', statsError);
//         }

//         return {
//             success: true,
//             data: {
//                 event,
//                 dates: eventDates || [],
//                 times: eventTimes || [],
//                 voteStats: voteStats || []
//             }
//         };

//     } catch (error) {
//         console.error('Unexpected error in fetchEventParallel:', error);
//         return { success: false, error: 'Unexpected error occurred' };
//     }
// }
