import { redirect } from 'next/navigation';

export default async function LearningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  params.set('tab', 'cheatsheets');

  for (const [key, val] of Object.entries(sp)) {
    if (key !== 'tab') {
      if (typeof val === 'string') {
        params.set(key, val);
      } else if (Array.isArray(val) && val[0]) {
        params.set(key, val[0]);
      }
    }
  }

  redirect(`/study?${params.toString()}`);
}
