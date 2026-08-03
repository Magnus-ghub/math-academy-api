// Digital SAT Math bo'limi uchun xom balldan (necha savol to'g'ri) shkalalangan
// ballga (200-800) o'tkazish jadvali. Bizda faqat Math bo'limi bor (Reading &
// Writing yo'q), shuning uchun 400-1600 emas, bitta bo'lim uchun 200-800 shkala
// ishlatiladi.
//
// Haqiqiy Digital SAT ikki bosqichli adaptiv: Module 1 natijasiga qarab
// Module 2 Easy/Medium/Hard qiyinlik darajasidan biriga yo'naltiriladi, va
// har biri o'z jadvaliga ega (mijoz bergan manba: "SAT Matematika Ballini
// Baholash Shkalasi"). Bizning Module 2'imiz hozircha statik (moslashuvchan
// emas) bo'lgani uchun faqat MEDIUM ustuni ishlatilmoqda — kelajakda Module 2
// moslashuvchan bo'lsa, talaba qaysi trekka tushganiga qarab mos jadval
// tanlanishi kerak.
const SAT_MATH_SCALED_SCORE: number[] = [
  200, 200, 200, 200, 200, 270, 270, 270, 270, 270,
  350, 350, 350, 420, 420, 420, 480, 480, 480, 480,
  490, 500, 510, 520, 530, 550, 550, 560, 570, 590,
  600, 620, 630, 640, 650, 670, 690, 700, 710, 730,
  750, 760, 770, 790, 800,
];

const MAX_RAW = SAT_MATH_SCALED_SCORE.length - 1; // 44

// totalQuestions har doim 44 bo'lishi kutiladi (2 x 22 savolli modul), lekin
// boshqa qiymat bo'lsa ham 0-44 oralig'iga proporsional moslashtiriladi.
export function getSatMathScaledScore(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return SAT_MATH_SCALED_SCORE[0];
  const rawOn44 = Math.round((correctAnswers / totalQuestions) * MAX_RAW);
  const index = Math.min(Math.max(rawOn44, 0), MAX_RAW);
  return SAT_MATH_SCALED_SCORE[index];
}
