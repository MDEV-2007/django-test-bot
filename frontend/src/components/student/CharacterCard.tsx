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
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-[var(--ps-purple)]">
      {imageUrl ? (
        /* Ataylab `next/image` EMAS, oddiy `<img>`: `avatar_url` — admin kiritadigan
           ixtiyoriy tashqi manzil, `next/image` esa har bir hostni ruxsat ro'yxatida talab qiladi. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="absolute inset-0 size-full object-cover" />
      ) : (
        /* Rasmsiz holat — pastel kompozitsiya va bosh harf. */
        <div className="absolute inset-0">
          <span aria-hidden className="absolute -right-10 -top-12 size-48 rounded-full bg-white/15" />
          <span aria-hidden className="absolute -bottom-10 -left-6 size-36 rounded-tr-full bg-[var(--ps-orange)]" />
          <span aria-hidden className="ps-dots absolute right-6 top-6 h-14 w-24 opacity-25" />
          <span className="absolute left-1/2 top-[42%] grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[6px] border-[#FFFCF7] bg-[#FFFCF7] font-[family-name:var(--font-grotesk)] text-[52px] font-bold text-[var(--ps-purple)] shadow-[0_24px_48px_-24px_rgba(40,20,80,0.8)] sm:size-32">
            {initial}
          </span>
        </div>
      )}

      {/* Scrim — matn o'qilishi uchun */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        {caption && (
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">{caption}</span>
        )}
        <p className="mt-2 font-[family-name:var(--font-grotesk)] text-[26px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[30px]">{name}</p>
      </div>
    </div>
  );
}
