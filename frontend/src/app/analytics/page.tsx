import { redirect } from 'next/navigation';

// Analitika endi profil sahifasida ko'rsatiladi — eski havolalar profilga yo'naltiriladi.
export default function AnalyticsPage() {
  redirect('/profile');
}
