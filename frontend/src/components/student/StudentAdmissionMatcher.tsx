'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target, Sparkles, ArrowRight, Search, Building2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

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

  const allItems: UniversityMajor[] = selectedBlock === 'all'
    ? Object.values(UNIVERSITIES_DB).flat()
    : UNIVERSITIES_DB[selectedBlock] || UNIVERSITIES_DB['tarix,ona-tili'];

  const filteredItems = allItems.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.uni.toLowerCase().includes(q) ||
        item.major.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    const isGrant = currentScore >= item.grantBall;
    const isKontrakt = currentScore >= item.kontraktBall && !isGrant;
    const isClose =
      currentScore < item.grantBall &&
      (item.grantBall - currentScore <= 15 || item.kontraktBall - currentScore <= 10);

    if (filterType === 'grant') return isGrant;
    if (filterType === 'kontrakt') return isKontrakt;
    if (filterType === 'close') return isClose;
    return true;
  });

  return (
    <div className="ios-card relative overflow-hidden rounded-[28px] p-5 sm:p-7 space-y-5 w-full">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#34C759]/30 bg-[#34C759]/10 px-2.5 py-1 text-xs font-bold text-[#34C759]">
            <PremiumIcon icon={Sparkles} tone="emerald" size="2xs" />
            <span>OTM Qabul Kalkulyatori (2026)</span>
          </div>

          {realPredictedScore !== null && (
            <button
              onClick={handleApplyRealScore}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
            >
              <PremiumIcon icon={Target} tone="sky" size="2xs" />
              <span>
                Sizning prognoz ballingiz: <strong className="font-mono">{realPredictedScore.toFixed(1)}</strong> (Qo&apos;llash)
              </span>
            </button>
          )}
        </div>

        <h3 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-foreground">
          Ballingiz qaysi universitetga yetadi?
        </h3>
        <p className="text-[13px] text-[#8E8E93] leading-relaxed">
          Rasmiy davlat qabul kvotalari va o&apos;tish ballari asosida grant hamda kontrakt imkoniyatingizni tekshiring.
        </p>
      </div>

      {/* Controls Row */}
      <div className="grid gap-3.5 sm:grid-cols-12 items-end">
        <div className="sm:col-span-4 min-w-0">
          <label className="block text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5">
            DTM / Mock ball (0 — 189)
          </label>
          <div className="relative">
            <Input
              type="text"
              inputMode="decimal"
              value={scoreInput}
              onChange={(e) => handleScoreChange(e.target.value)}
              placeholder="164.5"
              className="font-mono text-[17px] font-black pr-12"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#8E8E93] pointer-events-none">
              ball
            </span>
          </div>
        </div>

        <div className="sm:col-span-5 min-w-0">
          <label className="block text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1.5">
            Fanlar bloki
          </label>
          <select
            value={selectedBlock}
            onChange={(e) => handleBlockChange(e.target.value)}
            className="w-full h-11 rounded-[13px] border border-black/[0.08] dark:border-white/[0.1] bg-[#767680]/[0.08] dark:bg-[#767680]/[0.18] px-3.5 text-[13.5px] font-semibold text-foreground focus:outline-none focus:border-[#007AFF]"
          >
            <option value="tarix,ona-tili">Tarix + Ona tili (Gumanitar & Yuridik)</option>
            <option value="matematika,fizika">Matematika + Fizika (IT & Muhandislik)</option>
            <option value="biologiya,kimyo">Biologiya + Kimyo (Tibbiyot & Farmatsevtika)</option>
            <option value="matematika,english">Matematika + Ingliz tili (Iqtisodiyot & Moliya)</option>
            <option value="ona-tili,english">Ona tili + Ingliz tili (Xalqaro munosabatlar)</option>
            <option value="all">Barcha yo&apos;nalishlar</option>
          </select>
        </div>

        <div className="sm:col-span-3 min-w-0">
          <Button asChild className="w-full h-11 rounded-full">
            <Link href="/tests">
              Sinov test yechish <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* iOS Segmented Filter & Spotlight Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-black/[0.06] dark:border-white/[0.08] pt-4">
        <div className="ios-segmented overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `Barchasi (${allItems.length})` },
            { id: 'grant', label: 'Grant' },
            { id: 'kontrakt', label: 'Kontrakt' },
            { id: 'close', label: 'Yaqin ballar' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={cn(
                'px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer',
                filterType === tab.id
                  ? 'ios-segmented-thumb text-foreground'
                  : 'text-[#8E8E93] hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8E8E93] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="OTM yoki yo'nalish..."
            className="w-full h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-[#767680]/[0.08] dark:bg-[#767680]/[0.18] pl-9 pr-3.5 text-[12.5px] text-foreground placeholder:text-[#8E8E93] focus:outline-none focus:border-[#007AFF]"
          />
        </div>
      </div>

      {/* Matching Cards Grid */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[13px] text-[#8E8E93]">
            Mos keluvchi OTM yo&apos;nalishlari topilmadi.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isGrant = currentScore >= item.grantBall;
            const isKontrakt = currentScore >= item.kontraktBall && !isGrant;
            const diffGrant = currentScore - item.grantBall;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/65 dark:bg-[#2C2C2E]/60 p-4 transition-all hover:border-[#007AFF]/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] truncate">
                      {item.faculty}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
                        isGrant
                          ? 'bg-[#34C759]/15 text-[#34C759]'
                          : isKontrakt
                          ? 'bg-[#007AFF]/15 text-[#007AFF]'
                          : 'bg-[#FF9500]/15 text-[#FF9500]'
                      )}
                    >
                      {isGrant ? 'Grant' : isKontrakt ? 'Kontrakt' : 'Yaqin'}
                    </span>
                  </div>

                  <h4 className="mt-1.5 text-[14px] font-bold text-foreground leading-snug line-clamp-2">
                    {item.major}
                  </h4>
                  <p className="mt-1 text-[12px] text-[#8E8E93] flex items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0 text-[#007AFF]" />
                    <span className="truncate">{item.uni} ({item.city})</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] grid grid-cols-3 gap-2 text-[12px] font-mono">
                  <div>
                    <span className="text-[#8E8E93] block text-[10px] font-sans">Grant</span>
                    <span className="font-bold text-[#34C759]">{item.grantBall}</span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93] block text-[10px] font-sans">Kontrakt</span>
                    <span className="font-bold text-[#007AFF]">{item.kontraktBall}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#8E8E93] block text-[10px] font-sans">Farq</span>
                    <span className={cn('font-bold', diffGrant >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]')}>
                      {diffGrant >= 0 ? `+${diffGrant.toFixed(1)}` : diffGrant.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
