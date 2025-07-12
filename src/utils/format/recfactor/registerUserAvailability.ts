import { formatUserAvailability } from "./formatUserAvailability"
import { createClient } from '@/utils/supabase/server'
import { parseFormdata } from '@/utils/format/voteFormParser';


export async function registerUserAvailability(
    formData: FormData,
){
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();
    
    if (error) {
        console.error('Error fetching user:', error);
        throw new Error('ユーザー認証に失敗しました');
    }
    
    const { votes, eventId } = parseFormdata(formData);

    const registerData = formatUserAvailability(
        user.user?.id ?? null,
        votes.date_labels,
        votes.time_labels,
        votes.is_available
    );

    const data = registerData.map((vote) => ({
        user_id: vote.userId,
        start_timestamp: vote.startTImeStamp,
        end_timestamp: vote.endTimeStamp,
    }));

    // データを一括登録
    if (data.length > 0) {
        const { error } = await supabase
            .from('user_availability')
            .insert(data);
        if (error) {
            console.error('Error registering user availability:', error);
            throw new Error('ユーザーの利用可能時間の登録に失敗しました');
        }
    }
}