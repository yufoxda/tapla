export interface voteFormData {
    date_ids: string[];
    date_labels: string[];
    time_ids: string[];
    time_labels: string[];
    is_available: boolean[][]; // [date_index][time_index]
}

export function parseFormdata(formData: FormData): { votes: voteFormData, eventId: string } {
    const dateMap = new Map<string, string>();
    const timeMap = new Map<string, string>();
    const selectedVotes = new Set<string>();

    // ラベル情報と選択状況を収集
    for (const [key, value] of formData.entries()) {
        if( key.startsWith("date-label-")){
            dateMap.set(key.replace("date-label-", ""), value as string);
        } else if( key.startsWith("time-label-")){
            timeMap.set(key.replace("time-label-", ""), value as string);
        } else if( key.includes('__') && value === 'on') {
            selectedVotes.add(key);
        }
    }
    
    // 効率的な変換：Mapの順序を保持しながら一度に処理
    const dateEntries = Array.from(dateMap.entries());
    const timeEntries = Array.from(timeMap.entries());
    
    const dateIds = dateEntries.map(([id]) => id);
    const dateLabels = dateEntries.map(([, label]) => label);
    const timeIds = timeEntries.map(([id]) => id);
    const timeLabels = timeEntries.map(([, label]) => label);
    
    // 2次元配列を作成
    const isAvailable: boolean[][] = dateIds.map(dateId => 
        timeIds.map(timeId => selectedVotes.has(`${dateId}__${timeId}`))
    );
    
    const votes: voteFormData = {
        date_ids: dateIds,
        date_labels: dateLabels,
        time_ids: timeIds,
        time_labels: timeLabels,
        is_available: isAvailable
    };

    const eventId = formData.get('eventId') as string;
    if (!eventId) {
        throw new Error('Event ID is required');
    }
    
    return { votes, eventId };
}



