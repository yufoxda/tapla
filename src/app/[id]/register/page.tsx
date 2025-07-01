import {fetchEvent } from '../actions';

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
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
        <label>名前</label>
        <input type="text" required />
        <table>
          <thead>
            <tr>
              <th>時刻</th>
              {dates.map((date) => (
                <th key={date.id}>{date.date_label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
           {times.map((time: any) => (
              <tr key={time.id}>
                <td >
                  {time.time_label}
                </td>
                {dates.map((date: any) => {
                  const key = `${date.id}-${time.id}`;
                  return (
                    <td key={key}>
                      <input type="checkbox" name={key} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
}