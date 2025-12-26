'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Download, Star, Image as ImageIcon, UserPlus, Settings, RotateCcw, AlertCircle, Cake, MoveVertical, ToggleLeft, ToggleRight, Eye, Plus, Trash2, Save, X, Clock, Check, Share, FileUp, FileDown, Smartphone, Camera } from 'lucide-react';
import { toBlob, toJpeg } from 'html-to-image';

// --- 型定義 ---
type ShiftType = '早' | '遅' | 'OL' | 'その他';
type Shift = {
  id: string;
  day: number;
  castName: string;
  type: ShiftType;
  isBD?: boolean;
  timeRange?: string; 
};

type EventMap = { [key: number]: string };

type BackupData = {
  shifts: Shift[];
  eventMap: EventMap;
  registeredCasts: string[];
  year: number;
  month: number;
  backgroundImage: string | null;
  logoImage: string | null;
  bgZoom: number;
  bgX: number;
  bgY: number;
  headerGap: number;
  isLogoWhite: boolean;
};

const SHIFT_STYLES: Record<ShiftType, { bg: string; text: string; label: string }> = {
  '早': { bg: 'bg-[#FF0055]', text: 'text-white', label: '早' },
  '遅': { bg: 'bg-[#008080]', text: 'text-white', label: '遅' },
  'OL': { bg: 'bg-blue-600', text: 'text-white', label: 'OL' },
  'その他': { bg: 'bg-orange-500', text: 'text-white', label: '他' },
};

const HOURS_START = ['17','18','19','20','21','22','23','24','1','2','3'];
const HOURS_END = ['21','22','23','24','1','2','3','4','5','6','7','LAST'];

export default function CalendarApp() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [isSecondHalf, setIsSecondHalf] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [eventMap, setEventMap] = useState<EventMap>({});
  
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>('/logo.png'); 
  const [isLogoWhite, setIsLogoWhite] = useState(false);
  
  const [bgZoom, setBgZoom] = useState(100);
  const [bgX, setBgX] = useState(0);
  const [bgY, setBgY] = useState(0);
  const [headerGap, setHeaderGap] = useState(20);

  const [registeredCasts, setRegisteredCasts] = useState<string[]>([
    'もねまろ', 'ころすけ', 'あんそにー', 'たろう', 'ななし',
    'てんか', 'かずと', 'よう', 'ゆえ', 'ひな', 'むつ'
  ]);
  
  const [newCastNameInput, setNewCastNameInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputType, setInputType] = useState<ShiftType>('早');
  
  const [isEventInput, setIsEventInput] = useState(false);
  const [eventTitleInput, setEventTitleInput] = useState('');
  const [isBDInput, setIsBDInput] = useState(false);
  const [timeStart, setTimeStart] = useState('21');
  const [timeEnd, setTimeEnd] = useState('LAST');

  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showPreviewControls, setShowPreviewControls] = useState(true);

  const [previewScale, setPreviewScale] = useState(1);

  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRefBg = useRef<HTMLInputElement>(null);
  const fileInputRefLogo = useRef<HTMLInputElement>(null);
  const fileInputRefImport = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('girlsbar_calendar_data_v18'); 
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
    } catch (e) { console.error(e); }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const targetWidth = 1080; 
      const scale = (screenWidth < 1100) ? (screenWidth - 32) / targetWidth : 1;
      setPreviewScale(Math.max(scale, 0.2)); 
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const dataToSave = {
      shifts, eventMap, registeredCasts, backgroundImage, logoImage,
      year, month, bgZoom, bgX, bgY, headerGap, isLogoWhite
    };
    try {
      localStorage.setItem('girlsbar_calendar_data_v18', JSON.stringify(dataToSave));
      setSaveError(null);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') setSaveError('保存容量不足。背景を削除してください。');
    }
  }, [shifts, eventMap, registeredCasts, backgroundImage, logoImage, year, month, bgZoom, bgX, bgY, headerGap, isLogoWhite, isLoaded]);

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
        timeRange: inputType === 'その他' ? `${timeStart}-${timeEnd}` : undefined
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
    setTimeStart('21');
    setTimeEnd('LAST');
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

  const removeCast = (nameToRemove: string) => {
    if (confirm(`${nameToRemove} を登録リストから削除しますか？`)) {
      setRegisteredCasts(registeredCasts.filter(name => name !== nameToRemove));
    }
  };

  const resetAllData = () => {
    if (confirm('全てのデータを削除して初期状態に戻しますか？')) {
      localStorage.removeItem('girlsbar_calendar_data_v18');
      window.location.reload();
    }
  };

  const exportData = () => {
    const data: BackupData = {
      shifts, eventMap, registeredCasts, backgroundImage, logoImage,
      year, month, bgZoom, bgX, bgY, headerGap, isLogoWhite
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed: BackupData = JSON.parse(json);
        if(parsed.shifts) setShifts(parsed.shifts);
        if(parsed.eventMap) setEventMap(parsed.eventMap);
        if(parsed.registeredCasts) setRegisteredCasts(parsed.registeredCasts);
        if(parsed.backgroundImage) setBackgroundImage(parsed.backgroundImage);
        if(parsed.logoImage) setLogoImage(parsed.logoImage);
        if(parsed.bgZoom) setBgZoom(parsed.bgZoom);
        if(parsed.bgX !== undefined) setBgX(parsed.bgX);
        if(parsed.bgY !== undefined) setBgY(parsed.bgY);
        if(parsed.headerGap !== undefined) setHeaderGap(parsed.headerGap);
        if(parsed.year) setYear(parsed.year);
        if(parsed.month) setMonth(parsed.month);
        if(parsed.isLogoWhite !== undefined) setIsLogoWhite(parsed.isLogoWhite);
        alert('データを読み込みました');
        setIsSettingsOpen(false);
      } catch (err) {
        alert('読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  // --- ヘルパー：ウォームアップ（描画遅延対策） ---
  const warmUpEngine = async () => {
    if (!calendarRef.current) return;
    try {
        // 見えない状態で一度実行してキャッシュさせる
        await toJpeg(calendarRef.current, {
            quality: 0.1,
            width: 100,
            height: 100,
            style: { opacity: '0' }
        });
    } catch (e) {
        console.log("Warmup skipped");
    }
  };

  // --- 自動保存（シェア/ダウンロード） ---
  const handleAutoSave = async () => {
    if (!calendarRef.current || isGenerating) return;
    setIsGenerating(true);
    window.scrollTo(0, 0);

    try {
      // 1. ウォームアップ（これで背景白飛びを防ぐ）
      await warmUpEngine();
      // 少し待つ
      await new Promise(r => setTimeout(r, 100));

      // 2. 本番生成
      const blob = await toBlob(calendarRef.current, {
        quality: 0.95,
        width: 1080, 
        height: calendarRef.current.scrollHeight,
        pixelRatio: 1, 
        style: { transform: 'none', transformOrigin: 'top left', margin: '0', padding: '0' } 
      });

      if (!blob) throw new Error('Blob generation failed');

      const file = new File([blob], `shift_${year}_${month}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'シフト表',
          text: `${year}年${month}月のシフト表`
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `shift_${year}_${month}_${isSecondHalf?'2':'1'}.jpg`;
        link.href = url;
        link.click();
      }
    } catch (err) {
      console.error('Save failed', err);
      if ((err as Error).name !== 'AbortError') {
        alert('保存に失敗しました。「長押し保存」を試してください。');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 長押し保存（画像生成して表示） ---
  const handleManualSave = async () => {
    if (!calendarRef.current || isGenerating) return;
    setIsGenerating(true);
    window.scrollTo(0, 0);

    try {
      // ここでもウォームアップを入れる
      await warmUpEngine();
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await toJpeg(calendarRef.current, {
        quality: 0.95,
        width: 1080,
        height: calendarRef.current.scrollHeight,
        pixelRatio: 1,
        style: { transform: 'none', transformOrigin: 'top left', margin: '0', padding: '0' } 
      });
      setGeneratedImage(dataUrl);
    } catch(e) {
      alert('画像の生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const openModal = (day: number) => {
    setSelectedDay(day);
    setInputName('');
    const title = eventMap[day];
    setIsEventInput(!!title);
    setEventTitleInput(title || '');
    setIsBDInput(false);
    setTimeStart('21');
    setTimeEnd('LAST');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputName(val);
    if (registeredCasts.includes(val)) {
        e.target.blur();
    }
  };

  const days = getDaysArray();
  const yearsList = Array.from({ length: 6 }, (_, i) => 2025 + i);
  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      
      {/* --- 生成後の画像表示モーダル (長押し用) --- */}
      {generatedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="text-white text-center mb-4 font-bold text-lg animate-pulse">
            画像を長押しして「写真に保存」
          </div>
          <div className="relative w-full max-w-sm overflow-hidden rounded-lg shadow-2xl ring-2 ring-white/20">
             <img src={generatedImage} alt="Generated Calendar" className="w-full h-auto object-contain" />
          </div>
          <button 
            onClick={() => setGeneratedImage(null)}
            className="mt-8 bg-white text-black px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <Check size={20} /> 閉じる
          </button>
        </div>
      )}

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
                 <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-transparent font-bold text-lg outline-none appearance-none pr-1">
                   {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
                 <span className="text-xs font-bold text-gray-500">年</span>
                 <div className="w-px h-4 bg-gray-300 mx-1"></div>
                 <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-transparent font-bold text-lg outline-none appearance-none pr-1">
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
              
              <button onClick={handleManualSave} disabled={isGenerating} className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-600 flex items-center gap-1 text-xs font-bold whitespace-nowrap">
                <Smartphone size={18} /> <span className="hidden sm:inline">長押し保存</span>
              </button>

              <button 
                onClick={handleAutoSave} 
                disabled={isGenerating}
                className={`flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-bold shadow-sm text-sm ${isGenerating ? 'opacity-50' : ''}`}
              >
                <Share size={18} /> {isGenerating ? '...' : '保存'}
              </button>
            </div>
          </div>

          {isSettingsOpen && (
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in slide-in-from-top-2">
              <div className="p-3 bg-gray-50 rounded border">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <span className="font-bold text-gray-600 flex items-center gap-1"><Settings size={14}/> データ管理</span>
                  <div className="flex gap-2">
                    <button onClick={exportData} className="flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-200">
                      <FileDown size={14}/> 保存
                    </button>
                    <label className="flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-200 cursor-pointer">
                      <FileUp size={14}/> 復元
                      <input type="file" accept=".json" onChange={importData} className="hidden" ref={fileInputRefImport} />
                    </label>
                  </div>
                </div>

                <label className="block font-bold mb-2 text-gray-600 flex items-center gap-1"><UserPlus size={14}/> キャスト登録</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={newCastNameInput} onChange={(e) => setNewCastNameInput(e.target.value)} className="border p-2 rounded flex-1 outline-none" placeholder="名前" />
                  <button onClick={addNewCast} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 font-bold text-xs whitespace-nowrap">追加</button>
                </div>
                
                <div className="border-t pt-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">登録済み ({registeredCasts.length})</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {registeredCasts.map(name => (
                      <span key={name} className="bg-gray-100 border border-gray-200 px-2 py-1 rounded text-xs flex items-center gap-1 font-bold text-gray-700 group">
                        {name}
                        <button onClick={() => removeCast(name)} className="text-gray-400 hover:text-red-500 p-0.5 rounded-full hover:bg-gray-200"><X size={12}/></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-600 flex items-center gap-1"><ImageIcon size={14}/> ロゴ</label>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setIsLogoWhite(!isLogoWhite)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border font-bold ${isLogoWhite ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-800 border-gray-300'}`}>
                       {isLogoWhite ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                       {isLogoWhite ? '白' : '黒'}
                    </button>
                    <button onClick={() => fileInputRefLogo.current?.click()} className="border bg-white px-2 py-1 rounded text-xs flex items-center gap-1">変更</button>
                    <input type="file" accept="image/*" ref={fileInputRefLogo} onChange={(e) => handleImageUpload(e, setLogoImage)} className="hidden" />
                  </div>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-gray-600 flex items-center gap-1"><ImageIcon size={14}/> 背景</label>
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
                         <span className="text-xs font-bold w-12 text-right">横</span>
                         <input type="range" min="-500" max="500" value={bgX} onChange={(e) => setBgX(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold w-12 text-right">縦</span>
                         <input type="range" min="-500" max="500" value={bgY} onChange={(e) => setBgY(Number(e.target.value))} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-2">
                  <div className="flex items-center gap-2">
                     <MoveVertical size={14} className="text-gray-600"/>
                     <span className="text-xs font-bold w-20">隙間</span>
                     <input type="range" min="0" max="600" step="10" value={headerGap} onChange={(e) => setHeaderGap(Number(e.target.value))} className="flex-1 h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>

                <div className="pt-2 border-t mt-2">
                   <button onClick={resetAllData} className="flex items-center gap-1 text-red-500 text-xs hover:underline"><RotateCcw size={12}/> 全リセット</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- カレンダー描画エリア --- */}
      <div 
         className="scale-container"
         ref={calendarWrapperRef}
         style={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}
      >
        <div 
           style={{ 
             transform: `scale(${previewScale})`, 
             transformOrigin: 'top center',
             width: '1080px',
             height: 'auto',
             marginBottom: `-${(1080 * (1 - previewScale))}px`
           }}
        >
          <div 
            ref={calendarRef} 
            className="relative min-w-[1080px] overflow-hidden min-h-[1350px] shadow-2xl rounded-lg"
          >
            
            {/* レイヤー1: ベース白背景 */}
            <div className="absolute inset-0 bg-white z-0"></div>

            {/* レイヤー2: 背景画像（スライダーで動く） */}
            {backgroundImage && (
              <div className="absolute inset-0 overflow-hidden z-0">
                <img 
                  src={backgroundImage} 
                  className="w-full h-full object-cover origin-center"
                  style={{
                    transform: `translate(${bgX}px, ${bgY}px) scale(${bgZoom / 100})`
                  }}
                  alt=""
                  crossOrigin="anonymous" 
                />
              </div>
            )}

            {/* レイヤー3: コンテンツ */}
            <div className="relative z-10 pt-4 pb-6 px-8">
              <div className="text-center">
                <div className="flex justify-center mb-0">
                  <div className="w-full h-[280px] relative flex items-center justify-center"> 
                    <img 
                      src={logoImage || '/logo.png'} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      alt="店舗ロゴ" 
                      className={`w-full h-full object-contain drop-shadow-xl transition-all ${isLogoWhite ? 'brightness-0 invert' : ''}`} 
                    />
                  </div>
                </div>

                <div style={{ height: `${headerGap}px` }} className="transition-all duration-300"></div>

                <h1 className="text-4xl font-black tracking-wider mb-2 text-gray-900 drop-shadow-md bg-white/90 inline-block px-8 py-2 rounded-full backdrop-blur-sm border-2 border-gray-900 relative z-20">
                  {month}月{isSecondHalf ? '後半' : '前半'}シフト
                </h1>
              </div>

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
                                  
                                  <div className={`bg-gray-900 text-white font-bold px-1 py-1 flex-1 flex flex-col justify-center items-center text-center leading-none border-l border-white/20 rounded-r border-y border-r border-black/10 ${shift.isBD ? 'text-yellow-300 bg-gray-800' : ''}`}>
                                    {shift.timeRange && <span className="text-[10px] opacity-90 mb-0.5 font-mono">{shift.timeRange}</span>}
                                    <span className="flex items-center gap-1 truncate w-full justify-center">
                                      {shift.isBD && <Cake size={10} className="text-yellow-400 fill-yellow-400 shrink-0"/>}
                                      <span className="truncate">{shift.castName}</span>
                                    </span>
                                  </div>
                                  
                                  <button onClick={(e) => deleteShift(shift.id, e)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover/chip:opacity-100 transition-opacity no-print z-20 shadow-lg">
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
            <div className={`mb-4 p-3 rounded-xl border transition-all ${isEventInput ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-gray-50 border-transparent'}`}>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 mb-2">
                <input type="checkbox" checked={isEventInput} onChange={(e) => setIsEventInput(e.target.checked)} className="w-5 h-5 accent-yellow-500 rounded" />
                <Star size={20} className={isEventInput ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}/>
                <span>イベント日設定</span>
              </label>
              {isEventInput && (
                <input type="text" value={eventTitleInput} onChange={(e) => setEventTitleInput(e.target.value)} placeholder="イベント名" className="w-full border border-yellow-300 p-2 rounded bg-white font-bold" />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cast</label>
              <input 
                list="cast-options" 
                type="text" 
                value={inputName} 
                onChange={handleInputChange} 
                className="w-full bg-gray-50 border-2 border-gray-200 p-3 rounded-xl font-bold text-lg" 
                placeholder="名前" 
              />
              <datalist id="cast-options">
                {registeredCasts.map((name, i) => <option key={i} value={name} />)}
              </datalist>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(SHIFT_STYLES) as ShiftType[]).map((type) => (
                  <button key={type} onClick={() => setInputType(type)} className={`py-2 rounded-lg text-sm font-bold border-2 transition-all ${inputType === type ? `${SHIFT_STYLES[type].bg} ${SHIFT_STYLES[type].text} border-transparent shadow-lg transform -translate-y-1` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {SHIFT_STYLES[type].label}
                  </button>
                ))}
              </div>
            </div>

            {inputType === 'その他' && (
              <div className="mb-4 bg-orange-50 p-3 rounded-xl border border-orange-200 animate-in slide-in-from-top-1">
                <label className="flex items-center gap-2 text-xs font-bold text-orange-700 mb-2">
                  <Clock size={14}/> 時間指定
                </label>
                <div className="flex items-center gap-2">
                  <select value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className="bg-white border border-orange-300 rounded p-1 font-bold flex-1 text-center">
                    {HOURS_START.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="font-bold text-orange-400">~</span>
                  <select value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="bg-white border border-orange-300 rounded p-1 font-bold flex-1 text-center">
                    {HOURS_END.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="mb-6 mt-4 bg-pink-50 p-3 rounded-xl border border-pink-100">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 justify-center">
                <input type="checkbox" checked={isBDInput} onChange={(e) => setIsBDInput(e.target.checked)} className="w-5 h-5 accent-pink-500 rounded" />
                <Cake size={20} className={isBDInput ? 'text-pink-500 fill-pink-200' : 'text-gray-400'}/>
                <span className={isBDInput ? 'text-pink-600' : ''}>バースデー</span>
              </label>
            </div>

            <button onClick={addShift} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black flex items-center justify-center gap-2">
              <Save size={18} /> 決定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}