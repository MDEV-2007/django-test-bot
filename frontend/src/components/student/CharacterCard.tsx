/* Personaj kartasi — dizayn tizimidagi "4-daraja": rasm hukmron, matn rasm ustida.
 *
 * NEGA BU BOSHQA KARTALARDAN FARQ QILADI
 * Ro'yxat kartalari (fanlar, testlar, bo'limlar) MATN konteyneri — u yerda fon jim
 * turishi kerak, aks holda sarlavhani o'qish qiyinlashadi. Bu yerda esa aksincha:
 * rasm mahsulotning O'ZI. Amir Temurni topgan o'quvchi uning yuzini ko'rishi kerak,
 * ismini emas.
 *
 * Shuning uchun butun ilovada bu KARTA TURI EKRANDA BITTA bo'ladi: javob ochilgan
 * lahzada. Qolgan hamma joy jim turadi — "bir joyda jasur bo'l, qolgan joyda jim".
 *
 * SCRIM MAJBURIY
 * Rasm ustidagi matn oq joyga tushsa yo'qoladi. Shuning uchun rasm bilan matn
 * o'rtasida qora gradient (scrim) turadi — busiz bu kartani chizish mumkin emas.
 * Gradient pastdan yuqoriga: matn pastda, rasmning yuqori qismi ochiq qoladi.
 *
 * RASM BO'LMASA
 * Bazada hozir 16 ta personaj bor va HECH BIRIDA rasm yo'q (`avatar_url` bo'sh).
 * Shu sababli karta rasmsiz ham to'liq ishlaydi: o'rniga ismning bosh harfi va
 * tinch gradient chiziladi. Rasm qo'shilgan kuni karta o'zi "yonadi" — kodga
 * tegish shart emas.
 */
export default function CharacterCard({
  name, imageUrl, caption,
}: { name: string; imageUrl?: string | null; caption?: string }) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)]">
      {imageUrl ? (
        /* Ataylab `next/image` EMAS, oddiy `<img>`. `avatar_url` — admin kiritadigan
           ixtiyoriy tashqi manzil, `next/image` esa har bir hostni `next.config.ts`
           dagi ruxsat ro'yxatida talab qiladi. Ya'ni birinchi rasm qo'shilgan kuni
           sahifa ishlamay qolardi. Ilovaning qolgan qismi (avatarlar) ham shu
           sababdan oddiy `<img>` ishlatadi. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="absolute inset-0 size-full object-cover" />
      ) : (
        /* Rasmsiz holat — bo'sh kulrang quti emas, ataylab tuzilgan ko'rinish:
           bosh harf va yumshoq gradient. */
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-card-strong)] to-[var(--surface-hover)]">
          <span className="font-voice text-7xl font-bold text-[var(--text-faint)]">{initial}</span>
        </div>
      )}

      {/* Scrim — matn o'qilishi uchun. Rasm bo'lmasa ham qoladi: matn baribir
          gradient ustida turadi. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4">
        {caption && (
          <p className="font-mono text-xs uppercase tracking-wider text-white/70">{caption}</p>
        )}
        <p className="font-voice text-2xl font-bold leading-tight text-white">{name}</p>
      </div>
    </div>
  );
}
