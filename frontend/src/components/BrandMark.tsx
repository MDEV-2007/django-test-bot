/**
 * IlmIldizi logotipi. Bir joyda — logo o'zgarganda (`scripts/make-icons.py` qayta
 * ishlatilganda) barcha ekranlarda yangilanishi uchun, oldin har bir sahifa o'z
 * gradient doirasi ichida `lucide-react`ning `Sprout` ikonasini chizardi, ya'ni
 * yuklangan haqiqiy logotip hech qayerda ko'rinmasdi.
 *
 * `public/icon-192.png` ishlatiladi (Next.js'ning maxsus `app/icon.png` fayli emas) —
 * u aniq belgilangan URL bo'lib, o'lchami interfeys uchun ancha yetarli, `icon-512`ni
 * shu kichik joylarda yuklashning hojati yo'q.
 */
export function BrandMark({ size = 40, rounded = 'rounded-2xl' }: { size?: number; rounded?: string }) {
  return (
    <img
      src="/icon-192.png"
      alt="IlmIldizi"
      width={size}
      height={size}
      className={`shrink-0 ${rounded}`}
      style={{ width: size, height: size }}
    />
  );
}
