// Milliy Sertifikat uchun Rasch-uslubidagi baholash — akademiyaning avval
// Excel'da ishlatgan metodologiyasi asosida (500 talabalik "RASH 55 talik.xlsx"
// namunasi bilan tasdiqlangan). Xom balldan (necha item to'g'ri, odatda 0-55)
// logit orqali kogortaga (shu testni topshirgan barcha talabalarga) nisbatan
// standartlashtirilgan T-ball (o'rtacha=50, standart og'ish=10) hisoblanadi.
export const MILLIY_SERTIFIKAT_MIN_RESPONDENTS = 100;

// Uzluksizlik tuzatishi (continuity correction) — xom ball 0 yoki totalPoints
// bo'lganda ln(0) / ln(Infinity) chiqib ketmasligi uchun (p hech qachon 0
// yoki 1 bo'lmaydi).
export function computeLogit(rawPoints: number, totalPoints: number): number {
  const p = (rawPoints + 0.5) / (totalPoints + 1);
  return Math.log(p / (1 - p));
}

export function computeCohortStats(logits: number[]): { mean: number; sd: number } {
  const mean = logits.reduce((sum, l) => sum + l, 0) / logits.length;
  const variance = logits.reduce((sum, l) => sum + (l - mean) ** 2, 0) / logits.length;
  return { mean, sd: Math.sqrt(variance) };
}

export function getMilliySertifikatGrade(finalScore: number): string | null {
  if (finalScore >= 70) return 'A+';
  if (finalScore >= 65) return 'A';
  if (finalScore >= 60) return 'B+';
  if (finalScore >= 55) return 'B';
  if (finalScore >= 50) return 'C+';
  if (finalScore >= 46) return 'C';
  return null; // "Sertifikat berilmadi"
}
