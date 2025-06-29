'use client';


export default function createEvent() {
  return (
    <div>
      <h1>イベント作成</h1>
      <label >イベント名</label>
      <input/>
      <label>イベント説明</label>
      <textarea />
      <label>開始日</label>
      <input type="date" />
      <label>終了日</label>
      <input type="date" />
      <label>開始時刻</label>
      <input type="time" />
      <label>終了時刻</label>
      <input type="time" />
      <p>プレビュー</p>
      <table>
        <thead>
          <tr>
            <th>時間</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input/>
            </td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>日付</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input/>
            </td>
          </tr>
        </tbody>
      </table>
      <button>
      </button>
    </div>
  );
}
