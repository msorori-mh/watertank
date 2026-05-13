// Phones in this list are auto-promoted to admin on OTP login.
export const ADMIN_PHONES = ["780060056"];

const clean = (p: string) => p.replace(/[^0-9]/g, "").replace(/^00/, "").replace(/^967/, "");

export const isAdminPhone = (phone: string) => {
  const c = clean(phone);
  return ADMIN_PHONES.some((a) => clean(a) === c);
};
