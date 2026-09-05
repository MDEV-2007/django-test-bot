// Docker healthcheck uchun. Faqat Next.js jarayoni javob berayotganini tekshiradi —
// backendga murojaat qilmaydi: agar Django o'lsa, `web` konteynerining o'z probe'i buni
// aytadi, frontend esa hamon sog'lom (statik sahifalar ishlaydi) va uni qayta ishga
// tushirishning ma'nosi yo'q.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' });
}
