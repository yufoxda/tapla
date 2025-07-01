import {fetchEvent } from './actions';

export default async function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchEvent(id);

  if (!result.success || !result.data) {
    return (
      <div>
        <h1>エラー</h1>
        <p>イベントが見つかりませんでした</p>
      </div>
    );
  }
  else{
    const { event, dates, times, voteStats } = result.data;
    return (
      <>
        <h1>イベント: {event.title}</h1>
        <p>{event.description}</p>
        <h2>候補日</h2>
        <ul>
            {dates.map((date) => (
                <li key={date.id}>
                    {date.date_label} (列順: {date.column_order})
                </li>
            ))}
        </ul>
        <h2>候補時刻</h2>
        <ul>
            {times.map((time) => (
                <li key={time.id}>
                    {time.time_label} (行順: {time.row_order})
                </li>
            ))}
        </ul>
        <h2>投票統計</h2>
        <ul>
            {voteStats.map((stat, index) => (
                <li key={`${stat.event_date_id}-${stat.event_time_id}`}>
                    {stat.date_label} - {stat.time_label}: {stat.available_votes || 0}票 / {stat.total_votes || 0}票
                </li>
            ))}
        </ul>
        <p>イベントID: {event.id}</p>
        <p>作成者ID: {event.creator_id}</p>
        <p>作成日時: {new Date(event.created_at).toLocaleString()}</p>
        <p>更新日時: {new Date(event.updated_at).toLocaleString()}</p>
      </>
    );
  }
}
