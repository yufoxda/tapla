'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getuser } from '@/app/actions';
import {parseFormdata} from '@/utils/format/voteFormParser';

export async function registerVote(formData: FormData) {
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

        const {votes} = parseFormdata(formData);

        // 投票データを効率的に作成（O(n)）
        const voteRecords = votes.date_ids.flatMap((dateId, dateIndex) =>
            votes.time_ids.flatMap((timeId, timeIndex) =>
                votes.is_available[dateIndex][timeIndex] ? [{
                    user_id: user.id,
                    event_id: eventId,
                    date_id: dateId,
                    time_id: timeId,
                    is_available: true
                }] : []
            )
        );

        // 投票データを一括登録
        if (voteRecords.length > 0) {
            const { data: voted, error: votedError } = await supabase
                .from('votes')
                .insert(voteRecords);

            if (votedError) {
                console.error('Error creating votes:', votedError);
                throw new Error('投票の登録に失敗しました');
            }
        }

        

        revalidatePath(`/events/${eventId}`);
        
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
    
    redirect(`/events/${eventId}`);
}