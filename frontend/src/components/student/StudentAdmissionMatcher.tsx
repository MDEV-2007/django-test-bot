'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, Target, Sparkles, CheckCircle2, 
  ArrowRight, Search, RotateCcw, Building2, TrendingUp, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export interface UniversityMajor {
  id: string;
  uni: string;
  city: string;
  major: string;
  faculty: string;
  grantBall: number;
  kontraktBall: number;
  quota?: string;
  category: string;
}

const UNIVERSITIES_DB: Record<string, UniversityMajor[]> = {
  'tarix,ona-tili': [
    { id: '1', uni: "O'zbekiston Milliy Universiteti (O'zMU)", city: "Toshkent", major: "Tarix (mamlakatlar va yo'nalishlar bo'yicha)", faculty: "Tarix fakulteti", grantBall: 158.4, kontraktBall: 112.5, category: 'tarix,ona-tili' },
    { id: '2', uni: "Toshkent Davlat Sharqshunoslik Universiteti", city: "Toshkent", major: "Sharq mamlakatlari tarixi va falsafasi", faculty: "Sharq sivilizatsiyasi", grantBall: 164.2, kontraktBall: 120.0, category: 'tarix,ona-tili' },
    { id: '3', uni: "Toshkent Davlat Yuridik Universiteti (TDYU)", city: "Toshkent", major: "Yurisprudensiya (Davlat va huquqiy faoliyat)", faculty: "Ommaviy huquq", grantBall: 176.8, kontraktBall: 135.2, category: 'tarix,ona-tili' },
    { id: '4', uni: "Samarqand Davlat Universiteti (SamDU)", city: "Samarqand", major: "Tarix (yo'nalishlar bo'yicha)", faculty: "Tarix fakulteti", grantBall: 148.6, kontraktBall: 104.2, category: 'tarix,ona-tili' },
    { id: '5', uni: "Toshkent Davlat Pedagogika Universiteti (TDPU)", city: "Toshkent", major: "Tarix o'qitish metodikasi", faculty: "Tarix va pedagogika", grantBall: 142.0, kontraktBall: 98.5, category: 'tarix,ona-tili' },
    { id: '6', uni: "Farg'ona Davlat Universiteti (FarDU)", city: "Farg'ona", major: "Tarix", faculty: "Ijtimoiy fanlar", grantBall: 138.4, kontraktBall: 95.0, category: 'tarix,ona-tili' },
  ],
  'matematika,fizika': [
    { id: '7', uni: "Toshkent Axborot Texnologiyalari Universiteti (TATU)", city: "Toshkent", major: "Dasturiy injiniring", faculty: "Kompyuter injiniringi", grantBall: 162.5, kontraktBall: 118.0, category: 'matematika,fizika' },
    { id: '8', uni: "Toshkent Axborot Texnologiyalari Universiteti (TATU)", city: "Toshkent", major: "Kiberxavfsizlik injiniringi", faculty: "Kiberxavfsizlik", grantBall: 168.0, kontraktBall: 124.5, category: 'matematika,fizika' },
    { id: '9', uni: "O'zbekiston Milliy Universiteti (O'zMU)", city: "Toshkent", major: "Amaliy matematika va intellektual tizimlar", faculty: "Matematika", grantBall: 155.2, kontraktBall: 110.5, category: 'matematika,fizika' },
    { id: '10', uni: "Toshkent Davlat Texnika Universiteti (TDTU)", city: "Toshkent", major: "Mexatronika va robototexnika", faculty: "Muhandislik", grantBall: 136.0, kontraktBall: 98.0, category: 'matematika,fizika' },
    { id: '11', uni: "Samarqand Davlat Universiteti (SamDU)", city: "Samarqand", major: "Amaliy matematika va informatika", faculty: "Raqamli texnologiyalar", grantBall: 140.0, kontraktBall: 96.0, category: 'matematika,fizika' },
  ],
  'biologiya,kimyo': [
    { id: '12', uni: "Toshkent Tibbiyot Akademiyasi (TMA)", city: "Toshkent", major: "Davolash ishi", faculty: "Davolash fakulteti", grantBall: 174.5, kontraktBall: 130.0, category: 'biologiya,kimyo' },
    { id: '13', uni: "Toshkent Tibbiyot Akademiyasi (TMA)", city: "Toshkent", major: "Pediatriya ishi", faculty: "Bolalar tibbiyoti", grantBall: 165.2, kontraktBall: 122.0, category: 'biologiya,kimyo' },
    { id: '14', uni: "Toshkent Farmatsevtika Instituti", city: "Toshkent", major: "Farmatsiya (Klinik farmatsevtika)", faculty: "Farmatsevtika", grantBall: 156.0, kontraktBall: 115.0, category: 'biologiya,kimyo' },
    { id: '15', uni: "O'zbekiston Milliy Universiteti (O'zMU)", city: "Toshkent", major: "Biologiya (fan yo'nalishi) va Biotexnologiya", faculty: "Biologiya", grantBall: 148.0, kontraktBall: 108.0, category: 'biologiya,kimyo' },
    { id: '16', uni: "Samarqand Davlat Tibbiyot Universiteti (SamDTU)", city: "Samarqand", major: "Davolash ishi", faculty: "Tibbiyot", grantBall: 168.5, kontraktBall: 125.0, category: 'biologiya,kimyo' },
  ],
  'matematika,english': [
    { id: '17', uni: "Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)", city: "Toshkent", major: "Xalqaro iqtisodiyot va menejment", faculty: "Xalqaro iqtisod", grantBall: 181.2, kontraktBall: 142.0, category: 'matematika,english' },
    { id: '18', uni: "Toshkent Davlat Iqtisodiyot Universiteti (TDIU)", city: "Toshkent", major: "Moliya va moliyaviy texnologiyalar", faculty: "Moliya", grantBall: 172.0, kontraktBall: 128.5, category: 'matematika,english' },
    { id: '19', uni: "Toshkent Davlat Iqtisodiyot Universiteti (TDIU)", city: "Toshkent", major: "Iqtisodiyot (tarmoqlar bo'yicha)", faculty: "Iqtisodiyot", grantBall: 164.8, kontraktBall: 120.0, category: 'matematika,english' },
    { id: '20', uni: "O'zbekiston Milliy Universiteti (O'zMU)", city: "Toshkent", major: "Ekonometrika va amaliy statistika", faculty: "Iqtisodiyot", grantBall: 152.0, kontraktBall: 109.0, category: 'matematika,english' },
  ],
  'ona-tili,english': [
    { id: '21', uni: "Jahon Iqtisodiyoti va Diplomatiya Universiteti (JIDU)", city: "Toshkent", major: "Xalqaro munosabatlar va siyosatshunoslik", faculty: "Diplomatiya", grantBall: 184.6, kontraktBall: 148.0, category: 'ona-tili,english' },
    { id: '22', uni: "O'zbekiston Davlat Jahon Tillari Universiteti (O'zDJTU)", city: "Toshkent", major: "Filologiya va tillarni o'qitish (Ingliz tili)", faculty: "Ingliz tili", grantBall: 168.0, kontraktBall: 125.0, category: 'ona-tili,english' },
    { id: '23', uni: "O'zbekiston Jurnalistika va Ommaviy Kommunikatsiyalar Universiteti", city: "Toshkent", major: "Xalqaro jurnalistika va jamoatchilik aloqalari", faculty: "Jurnalistika", grantBall: 156.4, kontraktBall: 114.0, category: 'ona-tili,english' },
    { id: '24', uni: "O'zbekiston Milliy Universiteti (O'zMU)", city: "Toshkent", major: "O'zbek filologiyasi va adabiyotshunoslik", faculty: "O'zbek filologiyasi", grantBall: 152.0, kontraktBall: 110.0, category: 'ona-tili,english' },
  ],
};

export default function StudentAdmissionMatcher() {
  const { access } = useAuthStore();
  const [scoreInput, setScoreInput] = useState('164.5');
  const [selectedBlock, setSelectedBlock] = useState('tarix,ona-tili');
  const [filterType, setFilterType] = useState<'all' | 'grant' | 'kontrakt' | 'close'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [realPredictedScore, setRealPredictedScore] = useState<number | null>(null);

  // Load saved preferences or fetch real predicted DTM score
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('ilm_user_target_score');
      const savedBlock = localStorage.getItem('ilm_user_target_block');
      if (savedScore) setScoreInput(savedScore);
      if (savedBlock && UNIVERSITIES_DB[savedBlock]) setSelectedBlock(savedBlock);
    } catch {}

    if (access) {
      apiFetch<{ predicted_dtm: number | null; ready: boolean }>('/api/analytics/predicted-score/')
        .then((res) => {
          if (res?.ready && res.predicted_dtm) {
            setRealPredictedScore(res.predicted_dtm);
          }
        })
        .catch(() => {});
    }
  }, [access]);

  const handleScoreChange = (val: string) => {
    setScoreInput(val);
    try {
      localStorage.setItem('ilm_user_target_score', val);
    } catch {}
  };

  const handleBlockChange = (val: string) => {
    setSelectedBlock(val);
    try {
      localStorage.setItem('ilm_user_target_block', val);
    } catch {}
  };

  const handleApplyRealScore = () => {
    if (realPredictedScore !== null) {
      handleScoreChange(realPredictedScore.toFixed(1));
    }
  };

  const currentScore = parseFloat(scoreInput.replace(',', '.')) || 0;

  // Flatten or select items
  const allItems: UniversityMajor[] = selectedBlock === 'all'
    ? Object.values(UNIVERSITIES_DB).flat()
    : UNIVERSITIES_DB[selectedBlock] || UNIVERSITIES_DB['tarix,ona-tili'];

  // Filter items
  const filteredItems = allItems.filter((item) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch = item.uni.toLowerCase().includes(q) || 
                          item.major.toLowerCase().includes(q) || 
                          item.city.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Status filter
    const isGrant = currentScore >= item.grantBall;
    const isKontrakt = currentScore >= item.kontraktBall && !isGrant;
    const isClose = currentScore < item.grantBall && (item.grantBall - currentScore <= 15 || item.kontraktBall - currentScore <= 10);

    if (filterType === 'grant') return isGrant;
    if (filterType === 'kontrakt') return isKontrakt;
    if (filterType === 'close') return isClose;
    return true;
  });

  return (
    <Card className="relative overflow-hidden border-[var(--border-card)] bg-[var(--surface-card-medium)] shadow-sm w-full max-w-full">
      <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <CardHeader className="relative p-4 sm:p-6 pb-3 sm:pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3" /> OTM Qabul Bashorati (2025/2026)
          </Badge>

          {realPredictedScore !== null && (
            <button
              onClick={handleApplyRealScore}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <Target className="size-3.5 shrink-0" />
              <span>Sizning real DTM ballingiz: <strong className="font-mono">{realPredictedScore.toFixed(1)}</strong> (Qo&apos;yish)</span>
            </button>
          )}
        </div>

        <CardTitle className="font-voice text-lg sm:text-2xl font-bold tracking-tight">
          Ballingiz qaysi universitetga yetadi?
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm leading-relaxed">
          O&apos;tgan yilgi rasmiy davlat qabul mezonlari asosida hisoblanadi. Real vaqtda o&apos;zgartiring va mos yo&apos;nalishlarni solishtiring.
        </CardDescription>
      </CardHeader>

      <CardContent className="relative p-4 sm:p-6 pt-0 sm:pt-0 space-y-5 overflow-hidden">
        {/* Controls Row */}
        <div className="grid gap-3 sm:grid-cols-12 items-end">
          <div className="sm:col-span-4 min-w-0">
            <label className="block text-xs font-bold text-foreground mb-1">
              DTM / Mock ballingiz (0 — 189)
            </label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={scoreInput}
                onChange={(e) => handleScoreChange(e.target.value)}
                placeholder="164.5"
                className="font-mono text-base sm:text-lg font-black bg-[var(--surface-input)] border-[var(--border-card)] focus-visible:ring-emerald-500 pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                ball
              </span>
            </div>
          </div>

          <div className="sm:col-span-5 min-w-0">
            <label className="block text-xs font-bold text-foreground mb-1">
              Fanlar bloki
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => handleBlockChange(e.target.value)}
              className="w-full max-w-full truncate min-w-0 h-10 rounded-md border border-[var(--border-card)] bg-[var(--surface-input)] px-3 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="tarix,ona-tili">Tarix + Ona tili (Gumanitar & Yuridik)</option>
              <option value="matematika,fizika">Matematika + Fizika (AT & Muhandislik)</option>
              <option value="biologiya,kimyo">Biologiya + Kimyo (Tibbiyot & Farmatsevtika)</option>
              <option value="matematika,english">Matematika + Ingliz tili (Iqtisodiyot & Moliya)</option>
              <option value="ona-tili,english">Ona tili + Ingliz tili (Xalqaro munosabatlar)</option>
              <option value="all">Barcha yo&apos;nalishlar</option>
            </select>
          </div>

          <div className="sm:col-span-3 min-w-0">
            <Button asChild className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm">
              <Link href="/mock">
                Mock test ishlash <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-[var(--border-card)] pt-3.5 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                filterType === 'all'
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-[var(--surface-hover)] text-muted-foreground hover:text-foreground'
              }`}
            >
              Barchasi ({allItems.length})
            </button>
            <button
              onClick={() => setFilterType('grant')}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                filterType === 'grant'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-[var(--surface-hover)] text-muted-foreground hover:text-foreground'
              }`}
            >
              Faqat Grant
            </button>
            <button
              onClick={() => setFilterType('kontrakt')}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                filterType === 'kontrakt'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'bg-[var(--surface-hover)] text-muted-foreground hover:text-foreground'
              }`}
            >
              Faqat Kontrakt
            </button>
            <button
              onClick={() => setFilterType('close')}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                filterType === 'close'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-[var(--surface-hover)] text-muted-foreground hover:text-foreground'
              }`}
            >
              Yaqin ballar
            </button>
          </div>

          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="OTM yoki yo'nalish..."
              className="w-full h-8 rounded-lg border border-[var(--border-card)] bg-[var(--surface-input)] pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Matching Cards Grid */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
              Mos keluvchi OTM yo&apos;nalishlari topilmadi. Qidiruv so&apos;zini yoki filtrni o&apos;zgartirib ko&apos;ring.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isGrant = currentScore >= item.grantBall;
              const isKontrakt = currentScore >= item.kontraktBall && !isGrant;
              const diffGrant = currentScore - item.grantBall;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] p-3.5 sm:p-4 hover:border-emerald-500/40 hover:shadow-md transition-all w-full min-w-0 overflow-hidden"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground truncate flex-1 min-w-0">
                        {item.faculty}
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        isGrant 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                          : isKontrakt
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {isGrant ? "Grant" : isKontrakt ? "Kontrakt" : "Harakat qiling"}
                      </span>
                    </div>

                    <h4 className="mt-1.5 text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {item.major}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate flex-1 min-w-0">{item.uni} ({item.city})</span>
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[var(--border-card)]/60 grid grid-cols-3 gap-1 text-xs font-mono">
                    <div className="min-w-0">
                      <span className="text-muted-foreground block text-[10px]">Grant</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block truncate">{item.grantBall}</span>
                    </div>
                    <div className="min-w-0 text-center sm:text-left">
                      <span className="text-muted-foreground block text-[10px]">Kontrakt</span>
                      <span className="font-bold text-sky-600 dark:text-sky-400 block truncate">{item.kontraktBall}</span>
                    </div>
                    <div className="text-right min-w-0">
                      <span className="text-muted-foreground block text-[10px]">Farq</span>
                      <span className={`font-bold block truncate ${diffGrant >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--danger-text)]'}`}>
                        {diffGrant >= 0 ? `+${diffGrant.toFixed(1)}` : diffGrant.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-1 text-center text-[11px] text-muted-foreground">
          O&apos;tgan yilgi rasmiy qabul natijalari asosida hisoblangan. Yangi imtihonda yuqoriroq natija olish uchun zaif mavzular ustida ishlang.
        </div>
      </CardContent>
    </Card>
  );
}
