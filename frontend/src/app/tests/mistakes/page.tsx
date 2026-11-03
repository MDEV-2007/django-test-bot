import { redirect } from 'next/navigation';

// "Xatolarni tozalash" sahifasi /tests/revision bilan birlashtirildi:
// ikkala sahifa ham bir xil /api/tests/revision/ deck'ini ishlatardi.
export default function MistakesPage() {
  redirect('/tests/revision');
}
