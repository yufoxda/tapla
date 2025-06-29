"use server";
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache';

export interface DateData {
  date_label: string; // 日付のラベル（例: "2023-10-01"）
  col_order: number; // カラムの順序
}

export interface TimeData {
  time_label: string; // 時間のラベル（例: "09:00"）
  row_order: number; // 行の順序
}

export interface EventData {
  title: string; // イベントのタイトル
  description?: string; // イベントの説明（オプション）
  creator_id?: string; // 作成者のID（オプション）
}

export async function createEvent(data: {eventData: EventData, dates: DateData[], times: TimeData[]}) {
  try {
    // 1. 認証されたユーザー情報を取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error getting user:', authError);
      return { success: false, error: 'Authentication error' };
    }

    let creatorId = null;
    
    // 認証ユーザーがいる場合、usersテーブルからIDを取得
    if (user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (userError) {
        console.error('Error getting user data:', userError);
        // 認証ユーザーだが、usersテーブルにレコードがない場合でも続行
      } else {
        creatorId = userData.id;
      }
    }

    // 2. イベントを作成
    const { data: eventResult, error: eventError } = await supabase
      .from('events')
      .insert([{
        title: data.eventData.title,
        description: data.eventData.description,
        creator_id: creatorId // 認証ユーザーのIDまたはnull
      }])
      .select()
      .single();
    
    if (eventError) {
      console.error('Error creating event:', eventError);
      return { success: false, error: 'Failed to create event' };
    }

    const eventId = eventResult.id;

    // 2. event_datesレコードを作成
    if (data.dates.length > 0) {
      const eventDates = data.dates.map(date => ({
        event_id: eventId,
        date_label: date.date_label,
        column_order: date.col_order
      }));

      const { data: dateResults, error: datesError } = await supabase
        .from('event_dates')
        .insert(eventDates)
        .select();

      if (datesError) {
        console.error('Error creating event dates:', datesError);
        return { success: false, error: 'Failed to create event dates' };
      }

      // 3. event_timesレコードを作成
      const eventTimes = data.times.map(time => ({
        event_id: eventId,
        time_label: time.time_label,
        row_order: time.row_order
      }));

      const { data: timeResults, error: timesError } = await supabase
        .from('event_times')
        .insert(eventTimes)
        .select();

      if (timesError) {
        console.error('Error creating event times:', timesError);
        return { success: false, error: 'Failed to create event times' };
      }

      // Note: time_slotsはビューのため、event_datesとevent_timesの作成により自動的に生成される
      
      console.log(`Event created successfully with ${dateResults!.length} dates and ${timeResults!.length} times`);
    }
    
    // キャッシュを無効化してデータを再取得
    revalidatePath('/');
    
    return { success: true, eventId: eventId, data: eventResult };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Internal server error' };
  }
}