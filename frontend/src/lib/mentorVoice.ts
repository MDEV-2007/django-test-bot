/* Mentorning kunlik jumlasi.

   Muhim: bu yerda hech qanday "sun'iy motivatsiya" yo'q — har bir jumla o'quvchining
   HAQIQIY ma'lumotidan (zaif mavzu, streak, bajarilmagan missiya, oxirgi ball) tug'iladi.
   Umumiy "Zo'r ketyapsan!" jumlalari faqat aytadigan aniq gap qolmaganda ishlatiladi,
   va o'shanda ham raqamga tayanadi. */

export type NudgeInput = {
  firstName: string;
  streak: number;
  freezeCount: number;
  missionsTotal: number;
  missionsDone: number;
  weakTopic: { topic_title: string; times_wrong: number; days_ago: number } | null;
  lastScore: number | null;
  totalAttempts: number;
  solvedToday: number;
};

export type Nudge = { text: string; href?: string; cta?: string };

export function mentorNudge(i: NudgeInput): Nudge {
  // 1. Eng ustuvor: tuzatilmagan xato. O'rganish uchun eng katta foyda shu yerda.
  if (i.weakTopic && i.weakTopic.times_wrong >= 2) {
    const when = i.weakTopic.days_ago > 0 ? `${i.weakTopic.days_ago} kun oldin` : 'bugun';
    return {
      text: `«${i.weakTopic.topic_title}» mavzusida ${when} ${i.weakTopic.times_wrong} marta adashgansiz. 5 daqiqalik takrorlash tayyor.`,
      href: '/tests/revision',
      cta: 'Takrorlashni boshlash',
    };
  }

  // 2. Hali bitta ham test yechmagan — birinchi qadamni aniq ko'rsatamiz.
  if (i.totalAttempts === 0) {
    return {
      text: `${i.firstName}, birinchi test — eng qiyini. Undan keyin tizim sizning kuchli va zaif tomonlaringizni ko'rsata boshlaydi.`,
      href: '/tests',
      cta: 'Birinchi testni boshlash',
    };
  }

  // 3. Streak xavf ostida (muzlatish ham yo'q) — yumshoq, qo'rqitmaydigan eslatma.
  if (i.streak >= 3 && i.missionsDone === 0 && i.freezeCount === 0) {
    return {
      text: `${i.streak} kunlik uzluksizligingiz bugun uzilishi mumkin. Bitta kichik vazifa yetarli.`,
      href: '/tests',
      cta: 'Bugungi vazifani bajarish',
    };
  }

  // 4. Missiyalar tugagan — tan olamiz va keyingi qadamni taklif qilamiz.
  if (i.missionsTotal > 0 && i.missionsDone === i.missionsTotal) {
    return {
      text: `Bugungi ${i.missionsTotal} ta vazifa bajarildi. Xohlasangiz, arenada bilimni sinab ko'ring.`,
      href: '/battles',
      cta: 'Arenaga kirish',
    };
  }

  // 5. Oxirgi natija past — aybdorlik emas, aniq harakat taklif qilinadi.
  if (i.lastScore !== null && i.lastScore < 50) {
    return {
      text: `Oxirgi test ${Math.round(i.lastScore)}% bo'ldi. Bu — mavzuni takrorlash vaqti kelgani belgisi, boshqa hech narsa emas.`,
      href: '/learning',
      cta: 'Darsni ochish',
    };
  }

  // 6. Oxirgi natija yuqori — o'sishni nomlaymiz.
  if (i.lastScore !== null && i.lastScore >= 80) {
    return {
      text: `Oxirgi testda ${Math.round(i.lastScore)}%. Shu sur'atni ushlab tursangiz, keyingi daraja uzoq emas.`,
      href: '/analytics',
      cta: 'Tahlilni ko\'rish',
    };
  }

  // 7. Zaxira: hamrohlik hissi — bugun boshqalar ham ishlayapti.
  if (i.solvedToday > 1) {
    return {
      text: `Bugun ${i.solvedToday} nafar abituriyent test yechdi. Siz ham davom eting — kuniga bitta test yetarli.`,
      href: '/tests',
      cta: 'Test tanlash',
    };
  }

  return {
    text: `${i.firstName}, bugun qaysi mavzudan boshlaymiz?`,
    href: '/tests',
    cta: 'Test tanlash',
  };
}
