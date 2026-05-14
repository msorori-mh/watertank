/**
 * شعار وايت ماء — Logo
 * تصميم مبسط مسطّح: قطرة ماء + دبوس موقع + إيحاء صهريج/وايت.
 * يستخدم تدرّج أزرق سماوي يتوافق مع الهوية البصرية.
 */
type Props = {
  size?: number;
  withWordmark?: boolean;
  variant?: "color" | "mono-light" | "mono-dark";
  className?: string;
};

export function Logo({ size = 40, withWordmark = false, variant = "color", className = "" }: Props) {
  const id = `wm-${variant}`;
  const stroke =
    variant === "mono-light" ? "#ffffff" : variant === "mono-dark" ? "#0c4a6e" : "url(#" + id + ")";
  const fill =
    variant === "mono-light" ? "#ffffff" : variant === "mono-dark" ? "#0c4a6e" : "url(#" + id + ")";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} dir="rtl">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="وايت ماء"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0c4a6e" />
          </linearGradient>
        </defs>
        {/* دبوس موقع كحاوية */}
        <path
          d="M32 4C19.85 4 10 13.6 10 25.45c0 15.6 18.5 32.55 20.6 34.4a2.1 2.1 0 0 0 2.8 0C35.5 58 54 41.05 54 25.45 54 13.6 44.15 4 32 4Z"
          fill={fill}
          opacity={variant === "color" ? 0.12 : 0.15}
        />
        <path
          d="M32 4C19.85 4 10 13.6 10 25.45c0 15.6 18.5 32.55 20.6 34.4a2.1 2.1 0 0 0 2.8 0C35.5 58 54 41.05 54 25.45 54 13.6 44.15 4 32 4Z"
          stroke={stroke}
          strokeWidth="3"
        />
        {/* قطرة ماء داخل الدبوس */}
        <path
          d="M32 13c-1 0-1.9.55-2.4 1.45-2.5 4.4-7.6 11-7.6 16.05a10 10 0 1 0 20 0c0-5.05-5.1-11.65-7.6-16.05A2.75 2.75 0 0 0 32 13Z"
          fill={fill}
        />
        {/* انعكاس ضوء على القطرة */}
        <ellipse cx="28.5" cy="28" rx="1.6" ry="3.2" fill="#ffffff" opacity="0.65" />
      </svg>
      {withWordmark && (
        <div className="leading-tight">
          <p className="font-display font-extrabold text-deep text-base">وايت ماء</p>
          <p className="text-[10px] text-muted-foreground -mt-0.5">توصيل المياه العذبة</p>
        </div>
      )}
    </div>
  );
}
