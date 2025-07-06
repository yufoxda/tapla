'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getuser } from '@/app/actions';

export async function submitEventVote(formData: FormData) {
    const supabase = await createClient();

    const eventId = formData.get('eventId') as string;
    const participantName = formData.get('participantName') as string;

    const registerUser = await getuser();

    try {
        if (!eventId || !participantName.trim()) {
            throw new Error('必要な情報が不足しています');
        }

        // 1. ユーザーを登録（非認証ユーザーとして）
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([{ 
                name: participantName.trim(),
                auth_user_id: registerUser?.id ?? null // 非認証ユーザー
            }])
            .select()
            .single();

        if (userError) {
            console.error('Error creating user:', userError);
            throw new Error('ユーザーの登録に失敗しました');
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
                throw new Error('投票の保存に失敗しました');
            }
        }

        // 4. キャッシュを再検証
        revalidatePath(`/${eventId}`);
        revalidatePath(`/${eventId}/register`);

    } catch (error) {
        console.error('Unexpected error in submitEventVote:', error);
        throw new Error('予期しないエラーが発生しました');
    }
    
    redirect(`/${eventId}`);
}

