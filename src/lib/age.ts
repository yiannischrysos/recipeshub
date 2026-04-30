export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  other: "Other",
  prefer_not: "Prefer not to say",
};
