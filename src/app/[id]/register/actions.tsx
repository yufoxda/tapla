'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registerEvent(id: string, userId: string) {
    const supabase = await createClient();
    try {
        // イベント登録を行う
        const { data, error } = await supabase
            .from('event_registrations')
            .insert([{ event_id: id, user_id: userId }])
            .select()
            .single();
        if (error) {
            console.error('Error registering event:', error);
            return { success: false, error: 'Failed to register event' };
        }   
        // 登録成功後、キャッシュを再検証
        revalidatePath(`/events/${id}/register`);
        return { success: true, data };
    } catch (error) {
        console.error('Unexpected error in registerEvent:', error);
        return { success: false, error: 'Unexpected error occurred' };
    }
}

export async function submitEventVote(formData: FormData) {
    const supabase = await createClient();
    
    try {
        // フォームデータから値を取得
        const eventId = formData.get('eventId') as string;
        const participantName = formData.get('participantName') as string;
        
        if (!eventId || !participantName.trim()) {
            return { success: false, error: '必要な情報が不足しています' };
        }

        // 1. ユーザーを登録（非認証ユーザーとして）
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([{ 
                name: participantName.trim(),
                auth_user_id: null // 非認証ユーザー
            }])
            .select()
            .single();

        if (userError) {
            console.error('Error creating user:', userError);
            return { success: false, error: 'ユーザーの登録に失敗しました' };
        }

        // 2. 投票データを収集
        const votes = [];
        for (const [key, value] of formData.entries()) {
            if (key.includes('__') && value === 'on') { // __ で分割
                const [dateId, timeId] = key.split('__');
                votes.push({
                    user_id: user.id,
                    event_id: eventId,
                    event_date_id: dateId,
                    event_time_id: timeId,
                    is_available: true
                });
            }
        }

        // 3. 投票データを一括保存
        if (votes.length > 0) {
            const { error: votesError } = await supabase
                .from('votes')
                .insert(votes);

            if (votesError) {
                console.error('Error saving votes:', votesError);
                return { success: false, error: '投票の保存に失敗しました' };
            }
        }

        // 4. キャッシュを再検証
        revalidatePath(`/${eventId}`);
        revalidatePath(`/${eventId}/register`);

        return { 
            success: true, 
            message: '投票が正常に保存されました',
            userId: user.id 
        };

    } catch (error) {
        console.error('Unexpected error in submitEventVote:', error);
        return { success: false, error: '予期しないエラーが発生しました' };
    }
}