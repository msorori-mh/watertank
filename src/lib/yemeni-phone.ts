export const normalizeYemeniLocalPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00967")) digits = digits.slice(5);
  else if (digits.startsWith("967")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
};

export const isValidYemeniLocalPhone = (value: string) => /^7\d{8}$/.test(value);
export const toYemeniInternationalPhone = (local: string) => `+967${local}`;
