import { redirect } from 'next/navigation';

export default function MistakesRedirectPage() {
  redirect('/tests/revision');
}
