// Bot orqali ro'yxatdan o'tishda kiritilgan ism/familiyani tekshiradi va
// bir xil ko'rinishga keltiradi — aks holda "/start", "register", emoji yoki
// raqamlar to'g'ridan-to'g'ri foydalanuvchi ismi bo'lib saqlanib qolardi.

const MIN_LENGTH = 2;
const MAX_LENGTH = 30;

// O'zbekcha o'/g' uchun ishlatiladigan turli apostroflar bitta ' ga keltiriladi
const APOSTROPHES = /[ʻʼ‘’`´]/g;

// Har bir bo'lak harf bilan boshlanib-tugaydi; bo'laklar orasida bitta
// bo'sh joy, "-" yoki "'" bo'lishi mumkin (Abdulla o'g'li, Ali-Akbar, Ma'mur).
const NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

// Bot tugmalari/buyruqlari bilan adashib yozilishi mumkin bo'lgan so'zlar
const RESERVED = new Set([
  'start',
  'restart',
  'register',
  'login',
  'help',
  'menu',
  'stop',
  'cancel',
  'admin',
  'test',
  'bot',
  'ism',
  'familiya',
  'name',
  'старт',
]);

// Otasining ismidan keyingi qo'shimchalar kichik harfda qoladi: "Abdulla o'g'li"
const LOWERCASE_PARTICLES = new Set(["o'g'li", 'qizi']);

export type PersonNameResult = { ok: true; value: string } | { ok: false };

export function normalizePersonName(input: string): PersonNameResult {
  const cleaned = input.replace(APOSTROPHES, "'").replace(/\s+/g, ' ').trim();

  if (cleaned.length < MIN_LENGTH || cleaned.length > MAX_LENGTH)
    return { ok: false };
  if (!NAME_PATTERN.test(cleaned)) return { ok: false };
  if (RESERVED.has(cleaned.toLowerCase())) return { ok: false };

  // "aziz" / "AZIZ" → "Aziz", "ali-akbar" → "Ali-Akbar", "o'g'iloy" → "O'g'iloy"
  const value = cleaned
    .toLowerCase()
    .split(' ')
    .map((word) =>
      LOWERCASE_PARTICLES.has(word)
        ? word
        : word.replace(
            /(^|-)(\p{L})/gu,
            (_, sep: string, ch: string) => sep + ch.toUpperCase(),
          ),
    )
    .join(' ');

  return { ok: true, value };
}
