'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getuser } from '@/app/actions';
import { createUserAvailabilityPatternsFromFormData } from '@/utils/format/userTimes';

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

            // 4. ユーザーの可用性パターンを作成・保存
            try {
                const userAvailabilityPatterns = createUserAvailabilityPatternsFromFormData(
                    formData,
                    user.id
                );

                if (userAvailabilityPatterns.length > 0) {
                    const { error: patternError } = await supabase
                        .from('user_availability_patterns')
                        .insert(userAvailabilityPatterns);

                    if (patternError) {
                        console.error('Error creating user availability patterns:', patternError);
                        throw new Error('ユーザーの利用可能時間パターンの作成に失敗しました');
                    }
                }
            } catch (patternError) {
                console.error('Error in createUserAvailabilityPatternsFromFormData:', patternError);
                // パターン作成が失敗しても投票は保存されているので、警告のみで続行
                console.warn('ユーザーの利用可能時間パターンの作成をスキップしました');
            }
        }

        // 5. キャッシュを再検証
        revalidatePath(`/${eventId}`);
        revalidatePath(`/${eventId}/register`);

    } catch (error) {
        console.error('Unexpected error in submitEventVote:', error);
        throw new Error('予期しないエラーが発生しました');
    }
    
    redirect(`/${eventId}`);
}


