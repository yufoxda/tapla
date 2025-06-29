'use client';
import { handleClientScriptLoad } from "next/script";
import { useState, useEffect } from "react";
import { formatDate , createDateArray,createTimeArray } from "@/utils/format/times";


export default function createEvent() {
  
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


  return (
    <div>
      <h1>イベント作成</h1>
      <label>イベント名</label>
      <input 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
      />
      <label>イベント説明</label>
      <textarea 
        value={description} 
        onChange={(e) => setDescription(e.target.value)}
      />
      <label>開始日</label>
      <input 
        type="date" 
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <label>終了日</label>
      <input 
        type="date" 
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      <label>開始時刻</label>
      <input 
        type="time" 
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />
      <label>終了時刻</label>
      <input 
        type="time" 
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />
      <p>プレビュー</p>
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
      <button>
      </button>
    </div>
  );
}
