'use client';
import { handleClientScriptLoad } from "next/script";
import { useState, useEffect } from "react";
import { formatDate , createDateArray,createTimeArray } from "@/utils/format/times";
import { createEvent } from "./actions";
import { useRouter } from "next/navigation";
import { type EventData ,type TimeData,type DateData } from "./actions";


export default function createEventPage() {
  
  const router = useRouter(); // useRouterフックを追加
  
  const start_day = new Date();
  const end_day = new Date();
  end_day.setDate(start_day.getDate() + 5);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [startDate, setStartDate] = useState(formatDate(start_day));
  const [endDate, setEndDate] = useState(formatDate(end_day));

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const [rows, setRows] = useState(['']); // 縦軸：時間
  const [cols, setCols] = useState(['']); // 横軸：日付

  // 横軸（日付リスト）を自動更新する
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    if (currentDate > lastDate) {
      //todo: enddateを赤枠で表示
      return;
    }

    const dates = createDateArray(currentDate, lastDate);
    
    setCols(dates); // 横軸に日付を設定
  }, [startDate, endDate]);

  useEffect(() => {
    if (!startTime || !endTime) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (startTotalMinutes > endTotalMinutes) {
      // todo: endtimeを赤枠で表示
      return;
    }
    
    const times = createTimeArray(startTotalMinutes, endTotalMinutes);
    setRows(times); // 縦軸に時間を設定
  }, [startTime, endTime]);



  const handleTimeChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index] = value;
    if (index === rows.length - 1 && value.trim() !== '') {
      newRows.push('');
    }
    else if(index === rows.length - 2 && value.trim() === '') {
        newRows.pop();
    }
    setRows(newRows);
  };

  const handleDateChange = (index: number, value: string) => {
    const newCols = [...cols];
    newCols[index] = value;
    //最後の列が空でない場合は新しい列を追加
    if (index === cols.length - 1 && value.trim() !== '') {
      newCols.push('');
    }
    else if(index === cols.length - 2 && value.trim() === '') {
        newCols.pop();
    }
    setCols(newCols);
  };

  const handleCreate = async () => {
    
    try {
      // 基本情報の検証
      if (!title.trim()) {
        alert('タイトルを入力してください');
        return;
      }

      // 入力データを整理（空文字列を除去）
      const filteredDates = cols.filter(date => date.trim() !== '');
      const filteredTimes = rows.filter(time => time.trim() !== '');

      if (filteredDates.length === 0 || filteredTimes.length === 0) {
        alert('候補日と候補時刻を少なくとも1つずつ入力してください');
        return;
      }

      const result = await createEvent({
        eventData: {
          title,
          description,
          creator_id: undefined // Server Actionで自動的に設定される
        },
        dates: filteredDates.map(date => ({
          date_label: date, // 日付のラベル（例: "10-01"）
          col_order: filteredDates.indexOf(date) + 1 // 列の順序
        })),
        times: filteredTimes.map((time, index) => ({
          time_label: time, // 時間のラベル（例: "09:00"）
          row_order: index + 1 // 行の順序
        }))
      });
      
      if (result.success) {
        router.push(`/${result.eventId}`);
      } else {
        throw new Error(result.error || 'イベントの作成に失敗しました');
      }
      
    } catch (error) {
      console.error('Event creation error:', error);
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
    }
  };


  return (
    <div>
      <h1>イベント作成</h1>
      <label htmlFor="event-name">イベント名</label>
      <input 
        id="event-name"
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <label htmlFor="event-description">イベント説明</label>
      <textarea 
        id="event-description"
        value={description} 
        onChange={(e) => setDescription(e.target.value)}
      />
      <label htmlFor="start-date">開始日</label>
      <input 
        id="start-date"
        type="date" 
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <label htmlFor="end-date">終了日</label>
      <input 
        id="end-date"
        type="date" 
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      <label htmlFor="start-time">開始時刻</label>
      <input 
        id="start-time"
        type="time" 
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />
      <label htmlFor="end-time">終了時刻</label>
      <input 
        id="end-time"
        type="time" 
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>日付</th>
          </tr>
        </thead>
        <tbody>
          {cols.map((col, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={col}
                  onChange={(e) => handleDateChange(index, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>時間</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={row}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>プレビュー</p>
      <button
        onClick={handleCreate}   >
        イベントを作成
      </button>
    </div>
  );
}
