import type { ComputeEngine } from '@cortex-js/compute-engine';

// math-academy-client'dagi src/lib/utils.ts ichidagi parseSprAnswer bilan
// AYNI BIR XIL mantiq — talaba, admin (MathLive) va JSON orqali test
// yaratuvchi (AI/admin) tomonidan kiritilgan LaTeX ifoda ("\frac{9-3\sqrt{5}}
// {2}", "8\sqrt{5}/5" kabi) HAQIQIY son qiymatiga aylantiriladi, so'ng ×100
// qilib yaxlitlanadi. Ikki tomon (talaba javobi va admin javob kaliti) BIR
// XIL funksiya bilan hisoblangani uchun natijalar mos tushadi.
//
// "@cortex-js/compute-engine" faqat ESM sifatida tarqatiladi (CJS build'i
// yo'q), backend esa CommonJS'ga kompilyatsiya bo'ladi — shuning uchun
// oddiy `import`/`require` bilan emas, DINAMIK `import()` bilan (Node'ning
// CJS'dan ESM'ni yuklashning rasmiy yo'li) yuklaymiz.
let enginePromise: Promise<ComputeEngine> | null = null;

function getEngine(): Promise<ComputeEngine> {
  if (!enginePromise) {
    enginePromise = import('@cortex-js/compute-engine').then((mod) => {
      const ce = new mod.ComputeEngine();
      // Standart holda ComputeEngine "15^\circ" kabi darajali burchak
      // belgisini RADIANGA aylantirib hisoblaydi (15° -> 0.2618) — lekin
      // butun tizim (admin javob kaliti konventsiyasi) burchakni har doim
      // ODDIY GRADUS soni sifatida (15° -> 15, aylantirishsiz) kutadi.
      // Shu moslikni saqlash uchun "deg" rejimiga o'tkazamiz.
      ce.angularUnit = 'deg';
      return ce;
    });
  }
  return enginePromise;
}

export async function parseSprAnswer(
  raw: string | number | null | undefined,
): Promise<number> {
  if (typeof raw === 'number') return Math.round(raw);
  const s = (raw ?? '').trim();
  if (!s) return -1;
  try {
    const ce = await getEngine();
    // Qochirilmagan "%" LaTeX'da izoh (comment) belgisi — Compute Engine buni
    // "foiz" deb emas, oddiy chegara deb o'qib, "25%" ni "25" (0.25 emas!)
    // deb hisoblab qo'yadi. JSON orqali test yuklashda (AI/admin) "%"
    // qochirilmay kelishi mumkin — shuning uchun bu yerda "\%"ga aylantiramiz
    // (math-academy-client'dagi src/lib/utils.ts'dagi parseSprAnswer bilan
    // BIR XIL mantiq).
    // \dfrac/\tfrac — \frac'ning faqat ko'rinish (o'lcham) variantlari, lekin
    // backend'dagi Compute Engine (0.27) ularni tanimaydi va -1 qaytaradi
    // (client'dagi 0.58 esa taniydi) — natijada "\dfrac{\pi}{6}" kaliti -1
    // bo'lib saqlanib, to'g'ri javob ham xato deb baholanardi.
    const n = ce
      .parse(s.replace(/\\[dt]frac(?![a-zA-Z])/g, '\\frac').replace(/(?<!\\)%/g, '\\%'))
      .N();
    if (!n.isReal || n.re === undefined || !Number.isFinite(n.re)) return -1;
    return Math.round(n.re * 100);
  } catch {
    return -1;
  }
}
