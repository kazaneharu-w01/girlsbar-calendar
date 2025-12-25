'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Download, Plus, Trash2, Star, Image as ImageIcon, Upload, UserPlus, Settings, Save, RotateCcw, AlertCircle, Move, Search } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- 型定義 ---
type ShiftType = '早' | '遅' | 'OL' | 'その他';
type Shift = {
  id: string;
  day: number;
  castName: string;
  type: ShiftType;
};

// --- 設定: シフトの見た目 ---
const SHIFT_STYLES: Record<ShiftType, { bg: string; text: string; label: string }> = {
  '早': { bg: 'bg-[#FF0055]', text: 'text-white', label: '早' },
  '遅': { bg: 'bg-[#008080]', text: 'text-white', label: '遅' },
  'OL': { bg: 'bg-blue-600', text: 'text-white', label: 'OL' },
  'その他': { bg: 'bg-orange-500', text: 'text-white', label: '他' },
};

export default function CalendarApp() {
  // --- 状態管理 ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(12);
  const [isSecondHalf, setIsSecondHalf] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [eventDays, setEventDays] = useState<number[]>([]);
  
  // 画像設定
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  // 【修正点1】初期値をpublicフォルダの画像に設定（アップロードがあればそちら優先）
  const [logoImage, setLogoImage] = useState<string | null>('/logo.png'); 
  
  // 【修正点2】背景の調整用パラメータ
  const [bgZoom, setBgZoom] = useState(100); // %
  const [bgX, setBgX] = useState(50); // %
  const [bgY, setBgY] = useState(50); // %

  const [registeredCasts, setRegisteredCasts] = useState<string[]>(['キャストA', 'キャストB', 'キャストC']);
  
  // UI状態
  const [newCastNameInput, setNewCastNameInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputType, setInputType] = useState<ShiftType>('早');
  const [isEventInput, setIsEventInput] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);
  const fileInputRefBg = useRef<HTMLInputElement>(null);
  const fileInputRefLogo = useRef<HTMLInputElement>(null);

  // --- 画像圧縮用 ---
  const compressImage = (file: File, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const elem = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(elem.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // --- データ読み込み ---
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('girlsbar_calendar_data_v2'); // バージョン変更
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.eventDays) setEventDays(parsed.eventDays);
        if (parsed.registeredCasts) setRegisteredCasts(parsed.registeredCasts);
        if (parsed.backgroundImage) setBackgroundImage(parsed.backgroundImage);
        // ロゴは保存データがあればそれを、なければデフォルト(nullなら/logo.pngへ)
        if (parsed.logoImage) setLogoImage(parsed.logoImage);
        
        // 背景設定の復元
        if (parsed.bgZoom) setBgZoom(parsed.bgZoom);
        if (parsed.bgX !== undefined) setBgX(parsed.bgX);
        if (parsed.bgY !== undefined) setBgY(parsed.bgY);

        if (parsed.year) setYear(parsed.year);
        if (parsed.month) setMonth(parsed.month);
      }
    } catch (e) {
      console.error("読み込みエラー", e);
    }
    setIsLoaded(true);
  }, []);

  // --- データ保存 ---
  useEffect(() => {
    if (!isLoaded) return;
    
    const dataToSave = {
      shifts, eventDays, registeredCasts, backgroundImage, logoImage,
      year, month,
      bgZoom, bgX, bgY // 背景設定も保存
    };

    try {
      localStorage.setItem('girlsbar_calendar_data_v2', JSON.stringify(dataToSave));
      setSaveError(null);
    } catch (e: any) {
      console.error("保存失敗:", e);
      if (e.name === 'QuotaExceededError') {
        setSaveError('保存容量がいっぱいです。背景画像を削除してください。');
      }
    }
  }, [shifts, eventDays, registeredCasts, backgroundImage, logoImage, year, month, bgZoom, bgX, bgY, isLoaded]);

  // --- ロジック ---
  const getDaysArray = () => {
    const startDay = isSecondHalf ? 16 : 1;
    const lastDayObj = new Date(year, month, 0);
    const endDay = isSecondHalf ? lastDayObj.getDate() : 15;
    const days = [];
    const firstDateObj = new Date(year, month - 1, startDay);
    const startWeekDay = firstDateObj.getDay();
    for (let i = 0; i < startWeekDay; i++) days.push(null);
    for (let d = startDay; d <= endDay; d++) days.push(d);
    return days;
  };

  const addShift = () => {
    if (!selectedDay) return;
    if (inputName) {
      const newShift: Shift = {
        id: Math.random().toString(36).substr(2, 9),
        day: selectedDay,
        castName: inputName,
        type: inputType,
      };
      setShifts([...shifts, newShift]);
    }
    if (isEventInput) {
      if (!eventDays.includes(selectedDay)) setEventDays([...eventDays, selectedDay]);
    } else {
      setEventDays(eventDays.filter(d => d !== selectedDay));
    }
    setInputName('');
    setIsModalOpen(false);
  };

  const deleteShift = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShifts(shifts.filter(s => s.id !== id));
  };

  const addNewCast = () => {
    if (newCastNameInput && !registeredCasts.includes(newCastNameInput)) {
      setRegisteredCasts([...registeredCasts, newCastNameInput]);
      setNewCastNameInput('');
    }
  };

  const resetAllData = () => {
    if (confirm('全てのデータを削除して初期状態に戻しますか？')) {
      localStorage.removeItem('girlsbar_calendar_data_v2');
      window.location.reload();
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, setImage: (url: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const maxWidth = e.target === fileInputRefLogo.current ? 500 : 1280;
        const compressedDataUrl = await compressImage(file, maxWidth);
        setImage(compressedDataUrl);
      } catch (err) { alert('画像の読み込みに失敗しました'); }
    }
  };

  const downloadImage = async () => {
    if (!calendarRef.current) return;
    try {
      calendarRef.current.classList.add('generating-image');
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2, useCORS: true, backgroundColor: null,
      });
      calendarRef.current.classList.remove('generating-image');
      const link = document.createElement('a');
      link.download = `${year}年${month}月${isSecondHalf ? '後半' : '前半'}シフト.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { alert('画像の保存に失敗しました。'); }
  };

  const openModal = (day: number) => {
    setSelectedDay(day);
    setInputName('');
    setIsEventInput(eventDays.includes(day));
    setIsModalOpen(true);
  };

  const days = getDaysArray();
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans text-gray-800">
      <style jsx global>{`
        .generating-image .no-print { display: none !important; }
        input::-webkit-calendar-picker-indicator { opacity: 100; }
      `}</style>

      {saveError && (
        <div className="bg-red-500 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2">
          <AlertCircle size={16} /> {saveError}
          <button onClick={resetAllData} className="underline ml-2 bg-white text-red-500 px-2 rounded">Reset</button>
        </div>
      )}

      {/* --- 操作パネル --- */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm mb-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-gray-300 px-2 py-1 rounded bg-white">
                 <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-14 p-1 bg-transparent outline-none font-bold text-center" />
                 <span className="text-xs font-bold text-gray-500">年</span>
                 <input type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-10 p-1 bg-transparent outline-none font-bold text-center" />
                 <span className="text-xs font-bold text-gray-500">月</span>
              </div>
              <div className="flex bg-gray-200 rounded p-1 text-xs">
                <button onClick={() => setIsSecondHalf(false)} className={`px-3 py-1.5 rounded transition-all ${!isSecondHalf ? 'bg-white shadow font-bold text-blue-600' : 'text-gray-500'}`}>前半</button>
                <button onClick={() => setIsSecondHalf(true)} className={`px-3 py-1.5 rounded transition-all ${isSecondHalf ? 'bg-white shadow font-bold text-blue-600' : 'text-gray-500'}`}>後半</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 border rounded hover:bg-gray-100 text-gray-600 ${isSettingsOpen ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-300'}`}>
                <Settings size={20} />
              </button>
              <button onClick={downloadImage} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold shadow-sm text-sm">
                <Download size={18} /> 画像保存
              </button>
            </div>
          </div>

          {/* --- 設定エリア --- */}
          {isSettingsOpen && (
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm animate-in slide-in-from-top-2">
              
              {/* 左：キャスト登録 */}
              <div className="p-3 bg-gray-50 rounded border">
                <label className="block font-bold mb-2 text-gray-600 flex items-center gap-1"><UserPlus size={14}/> キャスト登録</label>
                <div className="flex gap-2 mb-1">
                  <input type="text" value={newCastNameInput} onChange={(e) => setNewCastNameInput(e.target.value)} className="border p-2 rounded flex-1 outline-none" placeholder="名前" />
                  <button onClick={addNewCast} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 font-bold text-xs whitespace-nowrap">追加</button>
                </div>
                <div className="text-xs text-gray-400">{registeredCasts.length}名登録中</div>
              </div>
              
              {/* 右：画像調整 */}
              <div className="p-3 bg-gray-50 rounded border space-y-4">
                {/* ロゴ設定 */}
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-600 flex items-center gap-1"><ImageIcon size={14}/> ロゴ画像</label>
                  <div className="flex gap-2">
                    {/* アップロードも残しておく */}
                    <button onClick={() => fileInputRefLogo.current?.click()} className="border bg-white px-2 py-1 rounded text-xs flex items-center gap-1">変更</button>
                    <input type="file" accept="image/*" ref={fileInputRefLogo} onChange={(e) => handleImageUpload(e, setLogoImage)} className="hidden" />
                  </div>
                </div>

                {/* 背景設定 */}
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-gray-600 flex items-center gap-1"><ImageIcon size={14}/> 背景画像</label>
                    <div className="flex gap-2">
                        {backgroundImage && <button onClick={() => setBackgroundImage(null)} className="text-xs text-red-500 underline">削除</button>}
                        <button onClick={() => fileInputRefBg.current?.click()} className="border bg-white px-2 py-1 rounded text-xs flex items-center gap-1">選択</button>
                        <input type="file" accept="image/*" ref={fileInputRefBg} onChange={(e) => handleImageUpload(e, setBackgroundImage)} className="hidden" />
                    </div>
                  </div>
                  
                  {/* 【修正点2】背景位置・サイズコントローラー */}
                  {backgroundImage && (
                    <div className="bg-white p-2 rounded border border-gray-200 space-y-2">
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-12">サイズ</span>
                         <input type="range" min="50" max="200" value={bgZoom} onChange={(e) => setBgZoom(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                         <span className="text-xs w-8 text-right">{bgZoom}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-12">横位置</span>
                         <input type="range" min="0" max="100" value={bgX} onChange={(e) => setBgX(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-12">縦位置</span>
                         <input type="range" min="0" max="100" value={bgY} onChange={(e) => setBgY(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t mt-2">
                   <button onClick={resetAllData} className="flex items-center gap-1 text-red-500 text-xs hover:underline"><RotateCcw size={12}/> 全データリセット</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- カレンダー描画エリア --- */}
      <div className="p-2 md:p-4">
        <div className="max-w-[1080px] mx-auto overflow-hidden shadow-2xl rounded-lg ring-1 ring-gray-200">
          <div 
            ref={calendarRef} 
            className="bg-white min-w-[800px] relative bg-no-repeat overflow-hidden"
            // 【修正点2】背景のスタイル動的適用
            style={{ 
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: `${bgZoom}%`,
                backgroundPosition: `${bgX}% ${bgY}%`
            }}
          >
            
            <div className="relative z-10 pt-10 pb-8 px-8">
              {/* ヘッダー・ロゴ */}
              <div className="text-center mb-6">
                <h1 className="text-5xl font-black tracking-wider mb-6 text-gray-900 drop-shadow-md bg-white/90 inline-block px-8 py-2 rounded-full backdrop-blur-sm border-2 border-gray-900">
                  {month}月{isSecondHalf ? '後半' : '前半'}シフト
                </h1>
                
                <div className="flex justify-center mb-6">
                  {/* 【修正点1】ロゴの表示（デフォルトは public/logo.png を参照） */}
                  <div className="w-72 h-72 relative flex items-center justify-center"> 
                    <img 
                      src={logoImage || '/logo.png'} 
                      onError={(e) => {
                          // 画像が見つからない場合のフォールバック
                          e.currentTarget.style.display = 'none';
                      }}
                      alt="店舗ロゴ" 
                      className="w-full h-full object-contain drop-shadow-xl" 
                    />
                    {/* 画像がない時に表示するエリア（画像ロード失敗時用） */}
                    {!logoImage && (
                        <div className="absolute inset-0 bg-gray-100/50 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 font-bold backdrop-blur-sm -z-10">
                        Logos
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* カレンダーグリッド */}
              <div className="border-4 border-gray-900 bg-white/90 shadow-lg rounded-sm overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-800 text-white font-bold text-center border-b-4 border-gray-900">
                  {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                    <div key={d} className={`py-3 text-lg border-r border-gray-600 last:border-r-0 ${i===0 ? 'text-pink-300' : ''} ${i===6 ? 'text-blue-300' : ''}`}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 bg-white/40">
                  {days.map((day, i) => {
                    const weekIndex = i % 7;
                    const isSun = weekIndex === 0;
                    const isSat = weekIndex === 6;
                    const isEvent = day && eventDays.includes(day);
                    
                    let bgClass = 'bg-white/95'; 
                    if (isSun) bgClass = 'bg-pink-50/95';
                    if (isSat) bgClass = 'bg-blue-50/95';
                    if (isEvent) bgClass = isSun ? 'bg-pink-100/95' : (isSat ? 'bg-blue-100/95' : 'bg-yellow-50/95');

                    return (
                      <div 
                        key={i} 
                        className={`min-h-[150px] border-b-2 border-r-2 border-gray-300 p-1.5 relative group transition-colors ${bgClass} ${day ? 'cursor-pointer hover:bg-yellow-100' : ''}`}
                        onClick={() => day && openModal(day)}
                      >
                        {day && (
                          <>
                            <div className="flex justify-between items-start mb-1">
                              <div className="h-6 w-6 flex items-center justify-center">
                                {isEvent && <Star size={20} className="text-yellow-500 fill-yellow-500 drop-shadow-sm" />}
                              </div>
                              <div className={`text-2xl font-black ${isSun?'text-pink-600':(isSat?'text-blue-600':'text-gray-700')}`}>
                                {day}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              {shifts.filter(s => s.day === day).map(shift => (
                                <div key={shift.id} className="flex items-stretch text-sm shadow-md relative group/chip transform transition-transform hover:scale-[1.02]">
                                  <span className={`${SHIFT_STYLES[shift.type].bg} ${SHIFT_STYLES[shift.type].text} w-8 font-bold flex items-center justify-center text-xs rounded-l border-y border-l border-black/10`}>
                                    {SHIFT_STYLES[shift.type].label}
                                  </span>
                                  <span className="bg-gray-900 text-white font-bold px-2 py-1 flex-1 text-center truncate border-l border-white/20 rounded-r border-y border-r border-black/10">
                                    {shift.castName}
                                  </span>
                                  <button 
                                    onClick={(e) => deleteShift(shift.id, e)}
                                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover/chip:opacity-100 transition-opacity no-print z-20 shadow-lg"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 text-blue-500 no-print bg-white/80 rounded-full p-1">
                              <Plus size={24} />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-right mt-4 text-gray-800 font-bold text-sm bg-white/60 inline-block float-right px-2 py-1 rounded backdrop-blur-sm">
                 Created by Cast Calendar
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-800">
                <span className="bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">{selectedDay}</span>
                <span className="text-base">日の設定</span>
              </h3>
              <label className="flex flex-col items-center cursor-pointer gap-1">
                 <input type="checkbox" checked={isEventInput} onChange={(e) => setIsEventInput(e.target.checked)} className="hidden" />
                 <Star size={28} className={`transition-all ${isEventInput ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-300'}`}/>
                 <span className="text-[10px] font-bold text-gray-500">イベント</span>
              </label>
            </div>
            
            <hr className="my-4 border-gray-100"/>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cast Name</label>
              <input 
                list="cast-options"
                type="text" 
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-lg font-bold transition-all"
                placeholder="名前を選択 / 入力"
                autoFocus
              />
              <datalist id="cast-options">
                {registeredCasts.map((name, i) => <option key={i} value={name} />)}
              </datalist>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shift Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(SHIFT_STYLES) as ShiftType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setInputType(type)}
                    className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      inputType === type 
                        ? `${SHIFT_STYLES[type].bg} ${SHIFT_STYLES[type].text} border-transparent shadow-lg transform -translate-y-1` 
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SHIFT_STYLES[type].label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={addShift}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              保存して閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}