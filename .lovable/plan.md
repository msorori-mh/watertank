## نموذج العمولة الجديد

التطبيق لا يستلم قيمة الطلب. السائق يستلم كامل المبلغ من العميل، ويتراكم عليه عمولة فقط لصالح التطبيق. `drivers.balance` يمثل **عمولات مستحقة على السائق فقط**.

## التغييرات على قاعدة البيانات

### 1) جدول `commission_settings` (جديد)
- `id`, `city` (text، nullable = كل المدن)
- `capacity` (integer، nullable = كل السعات)
- `commission_type` ('fixed' | 'percentage')
- `commission_value` numeric default 0
- `free_until` date nullable
- `is_active` boolean default true
- `created_at`, `updated_at`
- RLS: قراءة للمصادقين، إدارة للأدمن فقط

### 2) إضافة أعمدة على `orders`
- `app_commission` numeric default 0
- `commission_status` text default 'unpaid'  (`unpaid` | `paid` | `free`)
- `commission_rule_snapshot` jsonb nullable

### 3) دالة `calculate_app_commission(_city, _capacity, _price)`
- تختار أنسب قاعدة فعالة (city+capacity > city > capacity > عام)
- إذا `free_until >= today` ⇒ 0 وحالة `free`
- fixed ⇒ القيمة، percentage ⇒ price*value/100
- لا تتجاوز قيمة الطلب
- ترجع `(amount, snapshot_jsonb)`

### 4) Trigger على `orders`
عند تحويل الحالة من `pending` إلى `approved`: احسب العمولة، خزّن `app_commission`، `commission_rule_snapshot`، و`commission_status` (`free` إذا 0 وإلا `unpaid`).

### 5) تعديل `collect_order_payment`
- بدل `balance += order.price` ⇒ `balance += app_commission`
- إذا `app_commission = 0` لا يتغير الرصيد، حالة العمولة `free`
- وإلا `commission_status = 'unpaid'`

### 6) تعديل `record_cash_handover`
- يبقى يخصم من `drivers.balance`
- يضيف ربط بأحدث طلبات السائق غير المسددة (تحديث `commission_status='paid'` للطلبات بقدر المبلغ المسلَّم) — اختياري بسيط: حدّث طلبات FIFO حتى استيعاب المبلغ

## التغييرات في الكود

### واجهة الإدارة
- صفحة جديدة: `src/routes/admin.commissions.tsx` لإدارة قواعد العمولة (CRUD)
- إضافة رابط في `AdminShell`
- تحديث `admin.finance.tsx`:
  - بطاقات: قيمة الطلبات (محصّلة عبر السائقين)، عمولات مستحقة، عمولات مسددة، عمولات غير مسددة، عمولات اليوم
  - تغيير "تسجيل تسليم مبلغ" ⇒ "تسديد عمولة التطبيق"
  - عمود الرصيد ⇒ "عمولات مستحقة"
- `admin.reports.tsx`: قسم عمولات (يومي، حسب السائق، حسب المدينة، صفرية، غير مسددة)
- `admin.orders.tsx`: عرض `app_commission` بجانب السعر

### واجهة السائق
- `driver.orders.tsx` و`driver.index.tsx`: إظهار قيمة الطلب (يستلمها كاملة) + عمولة التطبيق + ملاحظة توضيحية
- صفحة الطلب: نفس العرض

### بدون تغيير
- المصادقة، Google Login، RLS الحالية، Realtime، الإشعارات، دورة الطلب، اعتماد السائق، إنشاء الطلب
- الطلبات القديمة: `app_commission` افتراضي 0 ⇒ تُعامل كعمولة صفرية تلقائياً

## خطوات التنفيذ

1. Migration واحدة: إنشاء `commission_settings`، إضافة أعمدة `orders`، دوال `calculate_app_commission` و trigger، تعديل `collect_order_payment`، RLS
2. صفحة `admin.commissions.tsx` + رابط في `AdminShell`
3. تحديث `admin.finance.tsx` (مصطلحات + بيانات)
4. تحديث `admin.reports.tsx` (تقارير عمولة)
5. تحديث واجهات السائق لإظهار العمولة
6. اختبار الحالات: مجاني، ثابت، نسبة، تحصيل، تسليم