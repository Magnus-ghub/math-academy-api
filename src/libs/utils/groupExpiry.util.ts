// Guruh a'zoligining tugash vaqti: guruhga aniq tugash sanasi (endDate)
// belgilangan bo'lsa — barcha a'zolar uchun shu sana (kurs ma'lum kunda
// tugaydi), aks holda qo'shilgan paytdan boshlab durationMonths oy.
export function computeMemberExpiresAt(group: {
  endDate?: Date | null;
  durationMonths?: number | null;
}): Date {
  if (group.endDate) return new Date(group.endDate);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (group.durationMonths ?? 1));
  return expiresAt;
}
