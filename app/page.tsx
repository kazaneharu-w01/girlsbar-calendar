'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Download, Plus, Trash2, Star, Image as ImageIcon, UserPlus, Settings, Save, RotateCcw, AlertCircle, Cake } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- 型定義 ---
type ShiftType = '早' | '遅' | 'OL' | 'その他';
type Shift = {
  id: string;
  day: number;
  castName: string;
  type: ShiftType;
  isBD?: boolean;
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
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [isSecondHalf, setIsSecondHalf] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [eventDays, setEventDays] = useState<number[]>([]);
  
  // 画像設定
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>('/logo.png'); 
  
  // 背景調整パラメータ
  const [bgZoom, setBgZoom] = useState(100);
  const [bgX, setBgX] = useState(50);
  const [bgY, setBgY] = useState(50);

  const [registeredCasts, setRegisteredCasts] = useState<string[]>(['キャストA', 'キャストB', 'キャストC']);
  
  // UI状態
  const [newCastNameInput, setNewCastNameInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputType, setInputType] = useState<ShiftType>('早');
  const [isEventInput, setIsEventInput] = useState(false);
  const [isBDInput, setIsBDInput] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [previewScale, setPreviewScale] = useState(1);

  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
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
      const savedData = localStorage.getItem('girlsbar_calendar_data_v2');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.eventDays) setEventDays(parsed.eventDays);
        if (parsed.registeredCasts) setRegisteredCasts(parsed.registeredCasts);
        if (parsed.backgroundImage) setBackgroundImage(parsed.backgroundImage);
        if (parsed.logoImage) setLogoImage(parsed.logoImage);
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

  // --- 画面サイズに合わせて縮小率を計算 ---
  useEffect(() => {
    const handleResize = () => {
      if (calendarWrapperRef.current) {
        const screenWidth = window.innerWidth;
        const scale = (screenWidth < 1100) ? (screenWidth - 32) / 1080 : 1; 
        setPreviewScale(Math.max(scale, 0.2)); 
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- データ保存 ---
  useEffect(() => {
    if (!isLoaded) return;
    const dataToSave = {
      shifts, eventDays, registeredCasts, backgroundImage, logoImage,
      year, month, bgZoom, bgX, bgY
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
        isBD: isBDInput,
      };
      setShifts([...shifts, newShift]);
    }
    if (isEventInput) {
      if (!eventDays.includes(selectedDay)) setEventDays([...eventDays, selectedDay]);
    } else {
      setEventDays(eventDays.filter(d => d !== selectedDay));
    }
    setInputName('');
    setIsBDInput(false);
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
        const maxWidth = e.target === fileInputRefLogo.current ? 800 : 1280;
        const compressedDataUrl = await compressImage(file, maxWidth);
        setImage(compressedDataUrl);
      } catch (err) { alert('画像の読み込みに失敗しました'); }
    }
  };

  // 【修正点1】軽量化保存ロジック (Blob使用)
  const downloadImage = async () => {
    if (!calendarRef.current) return;
    try {
      calendarRef.current.classList.add('generating-image');
      
      const canvas = await html2canvas(calendarRef.current, {
        scale: 1.5, // 少し画質を上げる（Blobなら耐えられる可能性が高いため）
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      
      calendarRef.current.classList.remove('generating-image');

      // Blobとして出力（メモリ消費を抑える）
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('画像の生成に失敗しました。');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${year}年${month}月${isSecondHalf ? '後半' : '前半'}シフト.png`;
        link.href = url;
        link.click();
        
        // メモリ解放
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 'image/png', 0.9);

    } catch (err) {
      console.error('画像生成エラー:', err);
      alert('保存に失敗しました。スマホのメモリ不足の可能性があります。アプリを再起動してみてください。');
      calendarRef.current.classList.remove('generating-image');
    }
  };

  const openModal = (day: number) => {
    setSelectedDay(day);
    setInputName('');
    setIsEventInput(eventDays.includes(day));
    setIsBDInput(false);
    setIsModalOpen(true);
  };

  const days = getDaysArray();
  const yearsList = Array.from({ length: 6 }, (_, i) => 2025 + i);
  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans text-gray-800">
      <style jsx global>{`
        .generating-image .no-print { display: none !important; }
        .scale-container {
          width: 100%;
          overflow: hidden;
          display: flex;
          justify-content: center;
        }
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
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-gray-300 px-2 py-1 rounded bg-white shadow-sm">
                 <select 
                   value={year} 
                   onChange={(e) => setYear(Number(e.target.value))} 
                   className="bg-transparent font-bold text-lg outline-none appearance-none pr-1"
                 >
                   {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
                 <span className="text-xs font-bold text-gray-500">年</span>
                 <div className="w-px h-4 bg-gray-300 mx-1"></div>
                 <select 
                   value={month} 
                   onChange={(e) => setMonth(Number(e.target.value))} 
                   className="bg-transparent font-bold text-lg outline-none appearance-none pr-1"
                 >
                   {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
                 <span className="text-xs font-bold text-gray-500">月</span>
              </div>
              <div className="flex bg-gray-100 rounded p-1 text-xs border border-gray-200">
                <button onClick={() => setIsSecondHalf(false)} className={`px-3 py-1.5 rounded transition-all ${!isSecondHalf ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}>前半</button>
                <button onClick={() => setIsSecondHalf(true)} className={`px-3 py-1.5 rounded transition-all ${isSecondHalf ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}>後半</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 border rounded hover:bg-gray-100 text-gray-600 ${isSettingsOpen ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-300'}`}>
                <Settings size={20} />
              </button>
              <button onClick={downloadImage} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-bold shadow-sm text-sm">
                <Download size={18} /> 保存
              </button>
            </div>
          </div>

          {/* --- 設定エリア --- */}
          {isSettingsOpen && (
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in slide-in-from-top-2">
              <div className="p-3 bg-gray-50 rounded border">
                <label className="block font-bold mb-2 text-gray-600 flex items-center gap-1"><UserPlus size={14}/> キャスト登録</label>
                <div className="flex gap-2 mb-1">
                  <input type="text" value={newCastNameInput} onChange={(e) => setNewCastNameInput(e.target.value)} className="border p-2 rounded flex-1 outline-none" placeholder="名前" />
                  <button onClick={addNewCast} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 font-bold text-xs whitespace-nowrap">追加</button>
                </div>
                <div className="text-xs text-gray-400">{registeredCasts.length}名登録中</div>
              </div>
              <div className="p-3 bg-gray-50 rounded border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-600 flex items-center gap-1"><ImageIcon size={14}/> ロゴ画像</label>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRefLogo.current?.click()} className="border bg-white px-2 py-1 rounded text-xs flex items-center gap-1">変更</button>
                    <input type="file" accept="image/*" ref={fileInputRefLogo} onChange={(e) => handleImageUpload(e, setLogoImage)} className="hidden" />
                  </div>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-gray-600 flex items-center gap-1"><ImageIcon size={14}/> 背景画像</label>
                    <div className="flex gap-2">
                        {backgroundImage && <button onClick={() => setBackgroundImage(null)} className="text-xs text-red-500 underline">削除</button>}
                        <button onClick={() => fileInputRefBg.current?.click()} className="border bg-white px-2 py-1 rounded text-xs flex items-center gap-1">選択</button>
                        <input type="file" accept="image/*" ref={fileInputRefBg} onChange={(e) => handleImageUpload(e, setBackgroundImage)} className="hidden" />
                    </div>
                  </div>
                  {backgroundImage && (
                    <div className="bg-white p-2 rounded border border-gray-200 space-y-2">
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-8">Zoom</span>
                         <input type="range" min="50" max="200" value={bgZoom} onChange={(e) => setBgZoom(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-8">横</span>
                         <input type="range" min="0" max="100" value={bgX} onChange={(e) => setBgX(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-8">縦</span>
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
      <div className="scale-container" ref={calendarWrapperRef}>
        <div 
           style={{ 
             transform: `scale(${previewScale})`, 
             transformOrigin: 'top center',
             width: '1080px',
             height: 'auto',
             marginBottom: `-${(1080 * (1 - previewScale))}px`
           }}
        >
          <div className="max-w-[1080px] mx-auto overflow-hidden shadow-2xl rounded-lg ring-1 ring-gray-200">
            <div 
              ref={calendarRef} 
              className="bg-white min-w-[1080px] relative bg-no-repeat overflow-hidden min-h-[1350px]"
              style={{ 
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: `${bgZoom}%`,
                  backgroundPosition: `${bgX}% ${bgY}%`
              }}
            >
              
              {/* 【修正点3】余白の短縮 (pt-4, mb-1 に変更) */}
              <div className="relative z-10 pt-4 pb-6 px-8">
                {/* ヘッダー・ロゴ */}
                <div className="text-center mb-1">
                  
                  {/* 【修正点2】ロゴサイズ調整 (h-[280px]程度に変更) */}
                  <div className="flex justify-center -mb-2">
                    <div className="w-full h-[280px] relative flex items-center justify-center"> 
                      <img 
                        src={logoImage || '/logo.png'} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        alt="店舗ロゴ" 
                        className="w-full h-full object-contain drop-shadow-xl" 
                      />
                      {!logoImage && (
                          <div className="absolute inset-0 bg-gray-100/50 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 font-bold backdrop-blur-sm -z-10">
                          No Logo
                          </div>
                      )}
                    </div>
                  </div>

                  <h1 className="text-4xl font-black tracking-wider mb-2 text-gray-900 drop-shadow-md bg-white/90 inline-block px-8 py-2 rounded-full backdrop-blur-sm border-2 border-gray-900 relative z-20">
                    {month}月{isSecondHalf ? '後半' : '前半'}シフト
                  </h1>
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
                          className={`min-h-[140px] border-b-2 border-r-2 border-gray-300 p-1.5 relative group transition-colors ${bgClass} ${day ? 'cursor-pointer hover:bg-yellow-100' : ''}`}
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
                                    <span className={`bg-gray-900 text-white font-bold px-2 py-1 flex-1 text-center truncate border-l border-white/20 rounded-r border-y border-r border-black/10 flex items-center justify-center gap-1 ${shift.isBD ? 'text-yellow-300 bg-gray-800' : ''}`}>
                                      {shift.isBD && <Cake size={14} className="text-yellow-400 fill-yellow-400 animate-pulse"/>}
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
      </div>

      {/* --- 入力モーダル --- */}
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
                 <span className="text-[10px] font-bold text-gray-500">イベント日</span>
              </label>
            </div>
            
            <hr className="my-4 border-gray-100"/>

            <div className="mb-4 bg-pink-50 p-3 rounded-xl border border-pink-100">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 justify-center">
                <input type="checkbox" checked={isBDInput} onChange={(e) => setIsBDInput(e.target.checked)} className="w-5 h-5 accent-pink-500 rounded" />
                <Cake size={20} className={isBDInput ? 'text-pink-500 fill-pink-200' : 'text-gray-400'}/>
                <span className={isBDInput ? 'text-pink-600' : ''}>🎂 バースデーキャスト</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cast Name</label>
              <input 
                list="cast-options"
                type="text" 
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-lg font-bold transition-all"
                placeholder="名前を選択 / 入力"
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