import { formatUserAvailability } from "./formatUserAvailability"
import { createClient } from '@/utils/supabase/server'
import { parseFormdata } from '@/utils/format/voteFormParser';
import { getuser } from '@/app/actions';


export async function registerUserAvailability(
    formData: FormData,
){
    const supabase = await createClient();
    const registerUser = await getuser();
    const { votes, eventId } = parseFormdata(formData);

    const registerData = formatUserAvailability(
        registerUser?.id ?? null,
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