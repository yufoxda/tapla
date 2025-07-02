import {fetchEvent } from '../actions';
import { submitEventVote } from './actions';

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

  const { event, dates, times } = result.data;

  return (
    <>
      <h1>イベント参加登録</h1>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      
      <form action={submitEventVote}>
        <input type="hidden" name="eventId" value={id} />
        
        <div>
          <label>
            名前
          </label>
          <input 
            type="text" 
            id="participantName"
            name="participantName"
            required 
          />
        </div>

        <h3>参加可能な日時を選択してください</h3>
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
                <td>
                  {time.time_label}
                </td>
                {dates.map((date: any) => {
                  const key = `${date.id}__${time.id}`; // __ を区切り文字として使用
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

        <div>
          <button type="submit">
            登録する
          </button>
        </div>
      </form>
    </>
  );
}