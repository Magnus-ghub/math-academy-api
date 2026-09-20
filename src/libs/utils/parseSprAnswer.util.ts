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
    const n = ce.parse(s).N();
    if (!n.isReal || n.re === undefined || !Number.isFinite(n.re)) return -1;
    return Math.round(n.re * 100);
  } catch {
    return -1;
  }
}
