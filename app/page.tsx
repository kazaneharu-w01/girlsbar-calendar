'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Download, Star, Image as ImageIcon, UserPlus, Settings, RotateCcw, AlertCircle, Cake, MoveVertical, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
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

type EventMap = { [key: number]: string };

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
  
  // イベント管理
  const [eventMap, setEventMap] = useState<EventMap>({});
  
  // 画像設定
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>('/logo.png'); 
  // 【追加】ロゴの色反転フラグ
  const [isLogoWhite, setIsLogoWhite] = useState(false);
  
  // 背景・レイアウト調整
  const [bgZoom, setBgZoom] = useState(100);
  const [bgX, setBgX] = useState(50);
  const [bgY, setBgY] = useState(50);
  const [headerGap, setHeaderGap] = useState(20);

  const [registeredCasts, setRegisteredCasts] = useState<string[]>(['キャストA', 'キャストB', 'キャストC']);
  
  // UI状態
  const [newCastNameInput, setNewCastNameInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputType, setInputType] = useState<ShiftType>('早');
  
  // モーダル用
  const [isEventInput, setIsEventInput] = useState(false);
  const [eventTitleInput, setEventTitleInput] = useState('');
  const [isBDInput, setIsBDInput] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // スクリーンショットモード（UI非表示）
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      const savedData = localStorage.getItem('girlsbar_calendar_data_v4'); // バージョンアップ
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.eventMap) setEventMap(parsed.eventMap);
        if (parsed.registeredCasts) setRegisteredCasts(parsed.registeredCasts);
        if (parsed.backgroundImage) setBackgroundImage(parsed.backgroundImage);
        if (parsed.logoImage) setLogoImage(parsed.logoImage);
        if (parsed.bgZoom) setBgZoom(parsed.bgZoom);
        if (parsed.bgX !== undefined) setBgX(parsed.bgX);
        if (parsed.bgY !== undefined) setBgY(parsed.bgY);
        if (parsed.headerGap !== undefined) setHeaderGap(parsed.headerGap);
        if (parsed.year) setYear(parsed.year);
        if (parsed.month) setMonth(parsed.month);
        if (parsed.isLogoWhite !== undefined) setIsLogoWhite(parsed.isLogoWhite);
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
      shifts, eventMap, registeredCasts, backgroundImage, logoImage,
      year, month, bgZoom, bgX, bgY, headerGap, isLogoWhite
    };
    try {
      localStorage.setItem('girlsbar_calendar_data_v4', JSON.stringify(dataToSave));
      setSaveError(null);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') setSaveError('保存容量不足。背景を削除してください。');
    }
  }, [shifts, eventMap, registeredCasts, backgroundImage, logoImage, year, month, bgZoom, bgX, bgY, headerGap, isLogoWhite, isLoaded]);

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
    const newEventMap = { ...eventMap };
    if (isEventInput) {
      newEventMap[selectedDay] = eventTitleInput || 'EVENT';
    } else {
      delete newEventMap[selectedDay];
    }
    setEventMap(newEventMap);
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
      localStorage.removeItem('girlsbar_calendar_data_v4');
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

  // --- 画像保存ロジック（超軽量化版） ---
  const downloadImage = async () => {
    if (!calendarRef.current || isSaving) return;
    setIsSaving(true);
    
    // 保存処理
    const processSave = async (scale: number) => {
      // 1. 一時的に重いCSS（影など）を削除するためのクラスを付与
      calendarRef.current!.classList.add('saving-mode');
      
      try {
        const canvas = await html2canvas(calendarRef.current!, {
          scale: scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          // 以下の設定で余計な描画を省く
          onclone: (clonedDoc) => {
             const el = clonedDoc.querySelector('.saving-target') as HTMLElement;
             if(el) {
                 el.style.transform = 'none'; // 変形リセット
                 el.style.boxShadow = 'none'; // 影削除
             }
          }
        });
        
        calendarRef.current!.classList.remove('saving-mode');

        return new Promise<void>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) { reject('Blob作成失敗'); return; }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${year}年${month}月${isSecondHalf ? '後半' : '前半'}シフト.png`;
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 500);
            resolve();
          }, 'image/jpeg', 0.85); // PNGではなくJPEG(0.85)にすることでさらにメモリ節約
        });

      } catch (err) {
        calendarRef.current!.classList.remove('saving-mode');
        throw err;
      }
    };

    try {
      // まず等倍(1.0)でトライ。これならメモリも食わないはず
      await processSave(1.0);
    } catch (err) {
      console.warn('First attempt failed, retrying low quality...', err);
      try {
        // 失敗したら低画質(0.7)でリトライ
        await processSave(0.7);
        alert('メモリ不足のため、画質を調整して保存しました。');
      } catch (finalErr) {
        console.error('Save failed', finalErr);
        alert('保存できませんでした。\n「プレビューモード」ボタンを押して、スクリーンショットを撮る方法をお試しください。');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = (day: number) => {
    setSelectedDay(day);
    setInputName('');
    const title = eventMap[day];
    setIsEventInput(!!title);
    setEventTitleInput(title || '');
    setIsBDInput(false);
    setIsModalOpen(true);
  };

  const days = getDaysArray();
  const yearsList = Array.from({ length: 6 }, (_, i) => 2025 + i);
  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className={`min-h-screen bg-gray-100 font-sans text-gray-800 ${isPreviewMode ? 'bg-black' : 'pb-20'}`}>
      <style jsx global>{`
        .saving-mode .no-print { display: none !important; }
        .saving-mode { 
           /* 保存時は余計な装飾をカットしてメモリ節約 */
           box-shadow: none !important; 
           backdrop-filter: none !important;
        }
        .scale-container {
          width: 100%;
          overflow: hidden;
          display: flex;
          justify-content: center;
        }
      `}</style>

      {/* エラー表示 */}
      {!isPreviewMode && saveError && (
        <div className="bg-red-500 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2">
          <AlertCircle size={16} /> {saveError}
          <button onClick={resetAllData} className="underline ml-2 bg-white text-red-500 px-2 rounded">Reset</button>
        </div>
      )}

      {/* --- 操作パネル (プレビューモード時は非表示) --- */}
      {!isPreviewMode && (
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
                
                {/* プレビューモード切り替えボタン */}
                <button onClick={() => setIsPreviewMode(true)} className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-600 flex items-center gap-1 text-xs font-bold">
                  <Eye size={18} /> <span className="hidden sm:inline">スクショ用</span>
                </button>

                <button 
                  onClick={downloadImage} 
                  disabled={isSaving}
                  className={`flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-bold shadow-sm text-sm ${isSaving ? 'opacity-50' : ''}`}
                >
                  <Download size={18} /> {isSaving ? '...' : '保存'}
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
                    <div className="flex gap-2 items-center">
                      {/* 【追加】白黒反転スイッチ */}
                      <button 
                         onClick={() => setIsLogoWhite(!isLogoWhite)}
                         className={`flex items-center gap-1 px-2 py-1 rounded text-xs border font-bold ${isLogoWhite ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-800 border-gray-300'}`}
                      >
                         {isLogoWhite ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                         {isLogoWhite ? '白ロゴ' : '黒ロゴ'}
                      </button>
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
                           <span className="text-xs font-bold w-12 text-right">Zoom</span>
                           <input type="range" min="50" max="200" value={bgZoom} onChange={(e) => setBgZoom(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold w-12 text-right">横位置</span>
                           <input type="range" min="0" max="100" value={bgX} onChange={(e) => setBgX(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold w-12 text-right">縦位置</span>
                           <input type="range" min="0" max="100" value={bgY} onChange={(e) => setBgY(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 【追加】余白調整スライダー */}
                  <div className="border-t pt-2">
                    <div className="flex items-center gap-2">
                       <MoveVertical size={14} className="text-gray-600"/>
                       <span className="text-xs font-bold w-20">隙間サイズ</span>
                       <input 
                         type="range" min="0" max="500" step="10" // 【修正】最大値を500に増加
                         value={headerGap} 
                         onChange={(e) => setHeaderGap(Number(e.target.value))} 
                         className="flex-1 h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer" 
                       />
                    </div>
                  </div>

                  <div className="pt-2 border-t mt-2">
                     <button onClick={resetAllData} className="flex items-center gap-1 text-red-500 text-xs hover:underline"><RotateCcw size={12}/> 全データリセット</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- プレビューモード終了ボタン (オーバーレイ) --- */}
      {isPreviewMode && (
        <button 
          onClick={() => setIsPreviewMode(false)}
          className="fixed top-4 right-4 z-50 bg-white/90 text-black px-4 py-2 rounded-full font-bold shadow-lg text-sm border-2 border-black"
        >
          ✕ 閉じる
        </button>
      )}

      {/* --- カレンダー描画エリア --- */}
      <div className={`scale-container ${isPreviewMode ? 'items-center min-h-screen py-10' : ''}`} ref={calendarWrapperRef}>
        <div 
           style={{ 
             transform: `scale(${previewScale})`, 
             transformOrigin: 'top center',
             width: '1080px',
             height: 'auto',
             marginBottom: isPreviewMode ? '0' : `-${(1080 * (1 - previewScale))}px`
           }}
           className="saving-target"
        >
          <div 
            ref={calendarRef} 
            className="bg-white min-w-[1080px] relative bg-no-repeat overflow-hidden min-h-[1350px] shadow-2xl rounded-lg"
            style={{ 
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: `${bgZoom}%`,
                backgroundPosition: `${bgX}% ${bgY}%`
            }}
          >
            
            <div className="relative z-10 pt-4 pb-6 px-8">
              {/* ヘッダー・ロゴ */}
              <div className="text-center">
                
                <div className="flex justify-center mb-0">
                  <div className="w-full h-[280px] relative flex items-center justify-center"> 
                    <img 
                      src={logoImage || '/logo.png'} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      alt="店舗ロゴ" 
                      // 【追加】白黒反転フィルター適用
                      className={`w-full h-full object-contain drop-shadow-xl transition-all ${isLogoWhite ? 'brightness-0 invert' : ''}`} 
                    />
                    {!logoImage && (
                        <div className="absolute inset-0 bg-gray-100/50 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 font-bold backdrop-blur-sm -z-10">
                        No Logo
                        </div>
                    )}
                  </div>
                </div>

                {/* 【追加】このスペーサーでロゴとタイトルの距離を調整 */}
                <div style={{ height: `${headerGap}px` }} className="transition-all duration-300"></div>

                <h1 className="text-4xl font-black tracking-wider mb-2 text-gray-900 drop-shadow-md bg-white/90 inline-block px-8 py-2 rounded-full backdrop-blur-sm border-2 border-gray-900 relative z-20">
                  {month}月{isSecondHalf ? '後半' : '前半'}シフト
                </h1>
              </div>

              {/* カレンダーグリッド */}
              <div className="border-4 border-gray-900 bg-white/90 shadow-lg rounded-sm overflow-hidden mt-4">
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
                    const eventTitle = day ? eventMap[day] : undefined;
                    const isEvent = !!eventTitle;
                    
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
                              <div className="flex-1">
                                {isEvent && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-[10px] font-black text-yellow-600 bg-yellow-100 px-1 rounded truncate max-w-[80px] border border-yellow-300">
                                      {eventTitle}
                                    </span>
                                  </div>
                                )}
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

      {/* --- 入力モーダル --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-800">
                <span className="bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">{selectedDay}</span>
                <span className="text-base">日の設定</span>
              </h3>
            </div>
            
            <div className={`mb-4 p-3 rounded-xl border transition-all ${isEventInput ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-gray-50 border-transparent'}`}>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 mb-2">
                <input type="checkbox" checked={isEventInput} onChange={(e) => setIsEventInput(e.target.checked)} className="w-5 h-5 accent-yellow-500 rounded" />
                <Star size={20} className={isEventInput ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}/>
                <span>イベント日設定</span>
              </label>
              
              {isEventInput && (
                <input 
                  type="text" 
                  value={eventTitleInput}
                  onChange={(e) => setEventTitleInput(e.target.value)}
                  placeholder="イベント名 (例: 生誕祭)"
                  className="w-full border border-yellow-300 p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold"
                />
              )}
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