import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  Clock,
  Phone,
  Plus,
  Home,
  ClipboardList,
  Wallet,
  User,
  ChevronLeft,
  Truck,
} from "lucide-react";
import waterTruck from "@/assets/water-truck.png";

export const Route = createFileRoute("/")({
  component: Index,
});

type TankerSize = {
  id: string;
  name: string;
  liters: string;
  desc: string;
  price: number;
  popular?: boolean;
};

const TANKERS: TankerSize[] = [
  { id: "xs", name: "وايت صغير", liters: "١٠٠٠ لتر", desc: "للاستخدام اليومي البسيط", price: 4000 },
  { id: "s", name: "وايت متوسط", liters: "٣٠٠٠ لتر", desc: "مناسب للمنازل الصغيرة", price: 9000 },
  { id: "m", name: "وايت كبير", liters: "٥٠٠٠ لتر", desc: "الخيار الأمثل للعائلات", price: 14000, popular: true },
  { id: "l", name: "وايت جامبو", liters: "١٠٠٠٠ لتر", desc: "للمنشآت والمزارع", price: 26000 },
];

const WATER_TYPES = [
  { id: "sweet", name: "ماء حلو" },
  { id: "desalinated", name: "ماء محلاة" },
  { id: "well", name: "ماء آبار" },
];

function Index() {
  const [selected, setSelected] = useState("m");
  const [waterType, setWaterType] = useState("sweet");
  const current = TANKERS.find((t) => t.id === selected)!;
  const fmt = (n: number) => n.toLocaleString("ar-EG");

  return (
    <div className="min-h-screen bg-background font-body text-deep selection:bg-accent/30">
      <div className="max-w-md mx-auto bg-surface min-h-screen shadow-soft relative flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              توصيل إلى
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">حي الروضة، مأرب</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
          </div>
          <button
            aria-label="الحساب"
            className="size-10 rounded-full bg-background grid place-items-center ring-1 ring-border hover:ring-primary/40 transition"
          >
            <User className="size-4 text-primary" strokeWidth={2.5} />
          </button>
        </header>

        <main className="flex-1 pb-44 overflow-y-auto">
          {/* Hero */}
          <section className="px-6 pt-6 animate-fade-in">
            <div className="bg-primary rounded-[2rem] p-8 text-primary-foreground relative overflow-hidden shadow-glow">
              <div className="relative z-10 space-y-3">
                <h1 className="font-display text-3xl font-extrabold leading-tight text-balance">
                  اطلب وايت ماء الآن
                </h1>
                <p className="text-primary-foreground/85 text-sm max-w-[22ch] leading-relaxed">
                  مياه عذبة تصلك أينما كنت في أقل من ٦٠ دقيقة
                </p>
                <div className="flex items-center gap-2 pt-2 text-xs font-bold">
                  <span className="size-2 rounded-full bg-accent animate-pulse" />
                  <span>متاح الآن • ١٢ سائق قريب منك</span>
                </div>
              </div>
              <img
                src={waterTruck}
                alt="وايت ماء"
                width={400}
                height={400}
                className="absolute -left-6 -bottom-6 w-44 opacity-90 animate-truck pointer-events-none drop-shadow-2xl"
              />
            </div>
          </section>

          {/* Tanker sizes */}
          <section className="mt-10 px-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">اختر حجم الوايت</h2>
              <button className="text-primary text-xs font-bold flex items-center gap-1">
                قارن الأحجام <ChevronLeft className="size-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {TANKERS.map((t, i) => {
                const active = selected === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    style={{ animationDelay: `${100 + i * 100}ms` }}
                    className={`group relative p-4 rounded-2xl bg-surface border-2 text-right animate-slide-up transition-all duration-300 ${
                      active
                        ? "border-primary ring-4 ring-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {t.popular && (
                      <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[10px] px-3 py-1 rounded-full font-bold">
                        الأكثر طلباً
                      </span>
                    )}
                    <div className="flex items-center gap-4">
                      <div
                        className={`size-16 rounded-xl flex-shrink-0 grid place-items-center transition ${
                          active ? "bg-primary/10" : "bg-background"
                        }`}
                      >
                        <Truck
                          className={`size-7 ${active ? "text-primary" : "text-accent"}`}
                          strokeWidth={2.2}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{t.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.liters} • {t.desc}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className="block font-display font-extrabold text-primary text-lg">
                          {fmt(t.price)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold">ريال يمني</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Water type */}
          <section className="mt-8 px-6">
            <h2 className="font-display font-bold text-lg mb-3">نوع الماء</h2>
            <div className="grid grid-cols-3 gap-2">
              {WATER_TYPES.map((w) => {
                const active = waterType === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWaterType(w.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-surface text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {w.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Address & time */}
          <section className="mt-8 px-6 space-y-3">
            <h2 className="font-display font-bold text-lg mb-2">تفاصيل التوصيل</h2>
            <button className="w-full p-4 rounded-2xl bg-surface border border-border hover:border-primary/40 transition flex items-center gap-3 text-right">
              <div className="size-10 rounded-xl bg-background grid place-items-center shrink-0">
                <MapPin className="size-5 text-primary" strokeWidth={2.2} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  موقع التوصيل
                </p>
                <p className="text-sm font-bold mt-0.5">شارع الستين، بجوار جامع النور</p>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>

            <button className="w-full p-4 rounded-2xl bg-surface border border-border hover:border-primary/40 transition flex items-center gap-3 text-right">
              <div className="size-10 rounded-xl bg-background grid place-items-center shrink-0">
                <Clock className="size-5 text-primary" strokeWidth={2.2} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  وقت التوصيل
                </p>
                <p className="text-sm font-bold mt-0.5">أقرب وقت • خلال ٦٠ دقيقة</p>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          </section>

          {/* Active tracking */}
          <section className="mt-8 px-6">
            <div className="bg-deep rounded-3xl p-6 text-primary-foreground animate-slide-up">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                    طلب نشط
                  </span>
                  <h3 className="font-display font-bold text-lg mt-1">طلبك قادم الآن</h3>
                  <p className="text-primary-foreground/60 text-xs mt-0.5">
                    وايت متوسط • #٨٤٢١
                  </p>
                </div>
                <div className="bg-primary px-3 py-1.5 rounded-xl text-sm font-bold">
                  ١٢ دقيقة
                </div>
              </div>

              {/* Driver progress */}
              <div className="relative h-1.5 w-full rounded-full bg-primary-foreground/10 mb-5 overflow-hidden">
                <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-accent to-primary rounded-full" />
              </div>

              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-primary-foreground/10 grid place-items-center border border-primary-foreground/20 font-bold text-sm">
                  أ
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">أحمد المرادي</p>
                  <p className="text-[11px] text-primary-foreground/50 mt-0.5">
                    وايت إيسوزو ٥٠٠٠ لتر • م ر ب ٤٢٧
                  </p>
                </div>
                <button
                  aria-label="اتصال بالسائق"
                  className="size-10 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 grid place-items-center transition"
                >
                  <Phone className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </section>

          {/* Past orders */}
          <section className="mt-8 px-6">
            <h2 className="font-display font-bold text-lg mb-3">الطلبات السابقة</h2>
            <div className="bg-surface rounded-2xl border border-border divide-y divide-border">
              {[
                { name: "وايت جامبو", liters: "١٠٠٠٠ لتر", date: "١٢ شعبان", price: 26000 },
                { name: "وايت صغير", liters: "١٠٠٠ لتر", date: "٢٨ رجب", price: 4000 },
              ].map((o, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-accent/15 grid place-items-center text-primary text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-bold">{o.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {o.liters} • {o.date} • {fmt(o.price)} ر.ي
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/5 rounded-full hover:bg-primary/10 transition">
                    إعادة الطلب
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Sticky CTA */}
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-40 pointer-events-none">
          <button className="pointer-events-auto w-full bg-primary text-primary-foreground py-4 rounded-2xl font-display font-extrabold text-base shadow-glow flex items-center justify-center gap-3 active:scale-[0.98] hover:brightness-110 transition-all">
            <span>تأكيد الطلب • دفع نقداً</span>
            <span className="size-1 bg-primary-foreground/40 rounded-full" />
            <span>{fmt(current.price)} ر.ي</span>
          </button>
        </div>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface/95 backdrop-blur-xl border-t border-border px-6 pt-3 pb-6 grid grid-cols-5 items-center z-30">
          {[
            { icon: Home, label: "الرئيسية", active: true },
            { icon: ClipboardList, label: "طلباتي" },
          ].map((it, i) => (
            <button
              key={i}
              className={`flex flex-col items-center gap-1 ${
                it.active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <it.icon className="size-5" strokeWidth={2.2} />
              <span className="text-[10px] font-bold">{it.label}</span>
            </button>
          ))}

          <div className="flex justify-center">
            <button
              aria-label="طلب جديد"
              className="-translate-y-7 size-14 rounded-full bg-primary text-primary-foreground shadow-glow grid place-items-center hover:scale-105 active:scale-95 transition relative"
            >
              <span className="absolute inset-0 rounded-full bg-primary animate-ripple -z-10" />
              <Plus className="size-6" strokeWidth={2.8} />
            </button>
          </div>

          {[
            { icon: Wallet, label: "المحفظة" },
            { icon: User, label: "حسابي" },
          ].map((it, i) => (
            <button
              key={i}
              className="flex flex-col items-center gap-1 text-muted-foreground"
            >
              <it.icon className="size-5" strokeWidth={2.2} />
              <span className="text-[10px] font-bold">{it.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
