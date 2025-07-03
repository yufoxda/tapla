'use server';
import { createClient } from '@/utils/supabase/server';

export async function getuser() {
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }
    console.log('Fetched user:', user);
    return user.user;
}