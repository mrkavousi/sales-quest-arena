import type { AchievementMeta } from '../game/achievements';
import { getLevelDef, type LevelDef } from '../game/levels';
import { CATEGORIES, DIFFICULTY, getMission, type CategoryMeta } from '../game/missions';
import type { Mission, MissionCategory, MissionDifficulty, MissionStep, MissionView, PlayerProgress, RewardLine } from '../game/types';
import { translate, type Language } from './locale';

interface StepCopy {
  label: string;
  question: string;
  helper?: string;
  options?: Record<string, { label: string; hint?: string }>;
  scale?: [string, string, string, string, string];
  placeholder?: string;
  suggestions?: string[];
}

interface MissionCopy {
  title: string;
  shortTitle: string;
  description: string;
  steps: Record<string, StepCopy>;
}

const note = (overrides: Partial<StepCopy> = {}): StepCopy => ({
  label: 'یادداشت',
  question: 'یک یادداشت کوتاه اضافه کن',
  helper: 'یک خط کافی است.',
  placeholder: 'چیزی هست که بخواهی به خاطر بسپاری؟',
  ...overrides,
});

/** Translations are keyed by stable domain IDs, never by saved answer text. */
export const PERSIAN_MISSIONS: Record<string, MissionCopy> = {
  'customer-visit-challenge': {
    title: 'چالش بازدید از مشتری',
    shortTitle: 'بازدید از مشتری',
    description: 'به یک مشتری سر بزن و نتیجه را ثبت کن.',
    steps: {
      customer_type: {
        label: 'مشتری',
        question: 'به دیدار چه کسی رفتی؟',
        helper: 'مناسب‌ترین گزینه را انتخاب کن.',
        options: {
          existing: { label: 'مشتری فعلی', hint: 'کسی که از قبل با او کار می‌کنی' },
          new: { label: 'مشتری جدید', hint: 'به‌تازگی از تو خرید کرده' },
          potential: { label: 'مشتری بالقوه', hint: 'هنوز مشتری نشده است' },
        },
      },
      outcome: {
        label: 'نتیجه',
        question: 'در بازدید چه اتفاقی افتاد؟',
        helper: 'نتیجهٔ اصلی را انتخاب کن.',
        options: {
          successful_meeting: { label: 'ملاقات موفق', hint: 'یک گفت‌وگوی خوب' },
          product_presentation: { label: 'معرفی محصول', hint: 'محصولاتت را معرفی کردی' },
          order_received: { label: 'سفارش دریافت شد', hint: 'امتیاز پاداش!' },
          follow_up_required: { label: 'نیاز به پیگیری', hint: 'هنوز کارهایی باقی مانده' },
          customer_unavailable: { label: 'مشتری در دسترس نبود', hint: 'کسی برای گفت‌وگو حضور نداشت' },
        },
      },
      rating: {
        label: 'ارزیابی',
        question: 'بازدید چطور پیش رفت؟',
        helper: 'یک ستاره را انتخاب کن.',
        scale: ['خیلی سخت بود', 'می‌توانست بهتر باشد', 'بد نبود', 'خوب پیش رفت', 'عالی بود!'],
      },
      note: note({
        question: 'یک یادداشت کوتاه دربارهٔ بازدید بنویس',
        placeholder: 'مثلاً: تا جمعه پیش‌فاکتور ۲۰ عدد می‌خواهد',
        suggestions: ['فهرست قیمت خواست', 'هفتهٔ بعد تماس بگیرم', 'با تصمیم‌گیرنده ملاقات کردم'],
      }),
    },
  },
  'product-spotlight': {
    title: 'محصول در کانون توجه',
    shortTitle: 'معرفی محصول',
    description: 'یک محصول را به مشتری معرفی کن و واکنش او را ثبت کن.',
    steps: {
      showcase: {
        label: 'محصول معرفی‌شده',
        question: 'چه چیزی را معرفی کردی؟',
        options: {
          new_product: { label: 'محصول جدید', hint: 'تازه به فهرست اضافه شده' },
          best_seller: { label: 'پرفروش‌ترین محصول', hint: 'محبوب و امتحان‌پس‌داده' },
          special_offer: { label: 'پیشنهاد ویژه', hint: 'تخفیف یا طرح تشویقی' },
          bundle: { label: 'بستهٔ محصولات', hint: 'چند محصول در کنار هم' },
        },
      },
      reaction: {
        label: 'واکنش',
        question: 'واکنش مشتری چه بود؟',
        options: {
          ordered: { label: 'همان‌جا سفارش داد', hint: 'امتیاز پاداش!' },
          loved_it: { label: 'خیلی پسندید', hint: 'مشخص بود که علاقه‌مند است' },
          curious: { label: 'کنجکاو بود', hint: 'سؤال پرسید' },
          needs_time: { label: 'به زمان نیاز دارد', hint: 'می‌خواهد فکر کند' },
          not_interested: { label: 'علاقه‌مند نبود', hint: 'فعلاً مناسب او نیست' },
        },
      },
      rating: {
        label: 'ارزیابی',
        question: 'معرفی محصولت چقدر قوی بود؟',
        scale: ['سخت پیش رفت', 'کمی لرزان بود', 'قابل قبول بود', 'قانع‌کننده بود', 'فوق‌العاده بود!'],
      },
      note: note({ placeholder: 'مثلاً: اندازهٔ جدید را پسندید و دربارهٔ زمان تحویل پرسید' }),
    },
  },
  'follow-up-sprint': {
    title: 'مسابقهٔ پیگیری',
    shortTitle: 'پیگیری مشتری',
    description: 'دوباره با مشتری‌ای که قبلاً با او صحبت کرده‌ای ارتباط بگیر و نتیجه را ثبت کن.',
    steps: {
      channel: {
        label: 'روش ارتباط',
        question: 'چطور پیگیری کردی؟',
        options: {
          call: { label: 'تماس تلفنی' },
          message: { label: 'پیام' },
          email: { label: 'ایمیل' },
          in_person: { label: 'حضوری' },
        },
      },
      result: {
        label: 'نتیجه',
        question: 'نتیجه چه بود؟',
        options: {
          order: { label: 'سفارش دریافت شد', hint: 'امتیاز پاداش!' },
          meeting_booked: { label: 'قرار ملاقات گذاشته شد', hint: 'مرحلهٔ بعد مشخص شد' },
          still_deciding: { label: 'هنوز در حال تصمیم‌گیری است', hint: 'ارتباط را حفظ کن' },
          no_answer: { label: 'پاسخی نداد', hint: 'بعداً دوباره تلاش کن' },
          not_interested: { label: 'علاقه‌مند نبود', hint: 'فعلاً منتفی شد' },
        },
      },
      rating: {
        label: 'میزان علاقه',
        question: 'این مشتری بالقوه حالا چقدر علاقه‌مند است؟',
        scale: ['اصلاً علاقه‌مند نیست', 'کم', 'تا حدی', 'علاقه‌مند', 'خیلی مشتاق!'],
      },
      note: note({ placeholder: 'مثلاً: سه‌شنبهٔ آینده تصمیم می‌گیرد؛ پیشنهاد جدید را بفرستم' }),
    },
  },
  'new-customer-hunt': {
    title: 'شکار مشتری جدید',
    shortTitle: 'مشتری‌یابی',
    description: 'یک مشتری بالقوهٔ تازه پیدا کن و میزان پیشرفتت را ثبت کن.',
    steps: {
      source: {
        label: 'منبع',
        question: 'چطور او را پیدا کردی؟',
        options: {
          referral: { label: 'معرفی دیگران', hint: 'کسی تو را پیشنهاد کرد' },
          walk_in: { label: 'مراجعهٔ بدون هماهنگی', hint: 'خودت سر زدی' },
          event: { label: 'رویداد', hint: 'نمایشگاه، گردهمایی یا همایش' },
          online: { label: 'آنلاین', hint: 'وب‌سایت یا شبکه‌های اجتماعی' },
        },
      },
      stage: {
        label: 'مرحله',
        question: 'تا کجا پیش رفتی؟',
        options: {
          first_contact: { label: 'اولین تماس', hint: 'خودت را معرفی کردی' },
          meeting_booked: { label: 'قرار ملاقات گذاشته شد', hint: 'می‌خواهد بیشتر بداند' },
          offer_sent: { label: 'پیشنهاد ارسال شد', hint: 'قیمت‌ها مطرح شدند' },
          first_order: { label: 'اولین سفارش', hint: 'امتیاز پاداش!' },
        },
      },
      rating: {
        label: 'ظرفیت',
        question: 'این مشتری چقدر امیدوارکننده است؟',
        scale: ['احتمال کم', 'شاید', 'متوسط', 'امیدوارکننده', 'فرصتی طلایی!'],
      },
      note: note({ placeholder: 'مثلاً: مدیر سارا است، ماهانه خرید می‌کند و واتس‌اپ را ترجیح می‌دهد' }),
    },
  },
  'market-scout': {
    title: 'کاوشگر بازار',
    shortTitle: 'کاوش بازار',
    description: 'بازارت را بررسی کن و یک نکتهٔ مفید دربارهٔ آن ثبت کن.',
    steps: {
      topic: {
        label: 'موضوع',
        question: 'چه چیزی را بررسی کردی؟',
        options: {
          competitor_prices: { label: 'قیمت رقبا' },
          shelf_display: { label: 'قفسه و چیدمان' },
          customer_needs: { label: 'نیازهای مشتری' },
          new_trends: { label: 'روندهای جدید' },
        },
      },
      finding: {
        label: 'یافته',
        question: 'چه چیزی پیدا کردی؟',
        options: {
          opportunity: { label: 'یک فرصت', hint: 'جایی برای رشد وجود دارد' },
          threat: { label: 'یک تهدید', hint: 'رقبا در حال فعالیت‌اند' },
          needs_deeper_look: { label: 'نیاز به بررسی بیشتر', hint: 'ارزش بازدید دوباره را دارد' },
          nothing_new: { label: 'چیز تازه‌ای نبود', hint: 'همه‌چیز آرام است' },
        },
      },
      rating: {
        label: 'ارزش یافته',
        question: 'این یافته چقدر ارزشمند است؟',
        scale: ['کم‌اهمیت', 'اندک', 'مفید', 'ارزشمند', 'تحول‌آفرین!'],
      },
      note: note({ question: 'آنچه دیدی را توضیح بده', placeholder: 'مثلاً: رقیب قیمت دو محصول را ۱۰٪ کاهش داده' }),
    },
  },
  'sales-summit': {
    title: 'قلهٔ فروش',
    shortTitle: 'قلهٔ فروش',
    description: 'یک موفقیت واقعی در فروش را جشن بگیر و جایگاهت را در قله به دست بیاور.',
    steps: {
      win: {
        label: 'موفقیت',
        question: 'به چه چیزی رسیدی؟',
        options: {
          closed_deal: { label: 'قرارداد بستم', hint: 'امتیاز پاداش!' },
          hit_target: { label: 'به هدفم رسیدم', hint: 'هدف روزانه یا هفتگی' },
          upsell: { label: 'فروش بیشتر', hint: 'مشتری بیشتر خرید کرد' },
          renewal: { label: 'تمدید قرارداد', hint: 'مشتری به همکاری ادامه داد' },
        },
      },
      size: {
        label: 'اندازه',
        question: 'این موفقیت چقدر بزرگ بود؟',
        options: {
          small: { label: 'کوچک اما شیرین' },
          medium: { label: 'قابل توجه' },
          big: { label: 'بزرگ' },
          record: { label: 'رکوردشکن' },
        },
      },
      rating: {
        label: 'افتخار',
        question: 'چقدر به خودت افتخار می‌کنی؟',
        scale: ['یک روز عادی', 'کمی', 'راضی‌ام', 'افتخار می‌کنم', 'فوق‌العاده!'],
      },
      note: note({ question: 'چه چیزی باعث موفقیت شد؟', placeholder: 'مثلاً: تحویل را همراه سفارش پیشنهاد دادم' }),
    },
  },
};

export const PERSIAN_CATEGORIES: Record<MissionCategory, string> = {
  customer_visit: 'بازدید از مشتری',
  product_intro: 'معرفی محصول',
  follow_up: 'پیگیری مشتری',
  new_customer: 'جذب مشتری جدید',
  market_research: 'تحقیق بازار',
  sales_achievement: 'موفقیت در فروش',
};

/**
 * Persian copy for demo-store missions. Kept in its own map so the main
 * six-mission coverage test keeps measuring exactly the built-in catalog.
 */
export const PERSIAN_SPECIAL_MISSIONS: Record<string, MissionCopy> = {
  'vip-lounge': {
    title: 'لابی VIP',
    shortTitle: 'لابی VIP',
    description: 'یک گفت‌وگوی ویژه با بهترین مشتری‌ات انجام بده.',
    steps: {
      vip_topic: {
        label: 'موضوع',
        question: 'در لابی VIP دربارهٔ چه چیزی صحبت کردی؟',
        helper: 'موضوع اصلی را انتخاب کن.',
        options: {
          loyalty_offer: { label: 'پیشنهاد وفاداری', hint: 'قدردانی از همراهی' },
          exclusive_preview: { label: 'پیش‌نمایش ویژه', hint: 'اولین نگاه به چیز تازه' },
          partnership: { label: 'همکاری', hint: 'معاملهٔ بزرگ‌تر با هم' },
          feedback: { label: 'گفت‌وگوی بازخورد', hint: 'اول شنیدن' },
        },
      },
      vip_outcome: {
        label: 'نتیجه',
        question: 'مشتری VIP چه واکنشی داشت؟',
        helper: 'نتیجهٔ اصلی را انتخاب کن.',
        options: {
          big_order: { label: 'سفارش بزرگ', hint: 'امتیاز پاداش!' },
          loved_it: { label: 'خیلی پسندید', hint: 'واکنش مثبت' },
          thinking: { label: 'نیاز به زمان دارد', hint: 'می‌خواهد فکر کند' },
          no_answer: { label: 'ملاقات نشد', hint: 'امکان دیدار نبود' },
        },
      },
      rating: {
        label: 'ارزیابی',
        question: 'این وقت VIP چقدر ارزشمند بود؟',
        scale: ['بی‌خودی', 'بی‌حال', 'مفید', 'ارزشمند', 'پذیرایی درجه‌یک!'],
      },
    },
  },
  'midnight-route': {
    title: 'مسیر نیمه‌شب',
    shortTitle: 'مسیر نیمه‌شب',
    description: 'برای مشتریانی که فقط شب می‌توانند گفت‌وگو کنند، مسیر بعد از ساعت کاری بچین.',
    steps: {
      route_plan: {
        label: 'مسیر',
        question: 'چه مسیری برنامه‌ریزی کردی؟',
        helper: 'مسیر اصلی را انتخاب کن.',
        options: {
          late_shops: { label: 'فروشگاه‌های تا دیروقت', hint: 'شب‌رو' },
          warehouse: { label: 'انبار', hint: 'یک توقف در انبار' },
          delivery_hub: { label: 'مرکز توزیع', hint: 'جایی پرتردد' },
          home_visits: { label: 'دیدار خانگی', hint: 'سر زدن به خانه' },
        },
      },
      route_result: {
        label: 'نتیجه',
        question: 'مسیر نیمه‌شب چه نتیجه‌ای داشت؟',
        helper: 'نتیجهٔ اصلی را انتخاب کن.',
        options: {
          surprise_order: { label: 'سفارش غافلگیرکننده', hint: 'امتیاز پاداش!' },
          relationship: { label: 'رابطهٔ قوی‌تر', hint: 'اعتماد بیشتر' },
          intel: { label: 'اطلاعات بازار', hint: 'شناخت بهتر بازار' },
          nothing: { label: 'هنوز هیچ', hint: 'فعلاً بدون نتیجه' },
        },
      },
      rating: {
        label: 'ارزیابی',
        question: 'شیفت شب ارزشش را داشت؟',
        scale: ['هدر رفت', 'معمولی', 'قابل قبول', 'ارزشمند', 'قهرمان شب‌رو!'],
      },
    },
  },
};

export const PERSIAN_DIFFICULTIES: Record<MissionDifficulty, string> = {
  easy: 'آسان', medium: 'متوسط', hard: 'سخت',
};

export const PERSIAN_LEVELS: Record<number, string> = {
  1: 'تازه‌کار', 2: 'کاوشگر', 3: 'چالش‌جو', 4: 'عملکرد برتر', 5: 'قهرمان',
};

export const PERSIAN_ACHIEVEMENTS: Record<string, { title: string; description: string }> = {
  first_steps: { title: 'قدم‌های اول', description: 'اولین مأموریتت را تکمیل کن.' },
  deal_maker: { title: 'معامله‌ساز', description: 'مأموریتی را ثبت کن که در آن سفارش گرفته‌ای.' },
  five_star: { title: 'نمایندهٔ پنج‌ستاره', description: 'به یک مأموریت ۵ ستاره بده.' },
  daily_hero: { title: 'قهرمان روز', description: 'یک چالش روزانه را تکمیل کن.' },
  storyteller: { title: 'قصه‌گو', description: 'برای ۳ مأموریت یادداشت اضافه کن.' },
  high_five: { title: 'بزن قدش', description: '۵ مأموریت را تکمیل کن.' },
  on_fire: { title: 'روی دور موفقیت', description: '۳ روز پیاپی مأموریت انجام بده.' },
  explorer: { title: 'کاوشگر رو به رشد', description: 'به سطح ۲ برس.' },
  trailblazer: { title: 'پیشگام', description: 'همهٔ مأموریت‌های نقشه را تکمیل کن.' },
  champion: { title: 'قهرمان', description: 'به سطح ۵ برس.' },
};

export const PERSIAN_REWARDS: Record<string, string> = {
  mission_complete: 'تکمیل مأموریت',
  daily_bonus: 'پاداش چالش روزانه',
  order_bonus: 'پاداش دریافت سفارش',
};

function localizeStep(step: MissionStep, copy: StepCopy | undefined): MissionStep {
  if (!copy) return step;
  const base = { label: copy.label, question: copy.question, helper: copy.helper ?? step.helper };
  switch (step.type) {
    case 'choice':
      return { ...step, ...base, type: 'choice', options: step.options.map((option) => ({ ...option, ...copy.options?.[option.id] })) };
    case 'rating':
      return { ...step, ...base, type: 'rating', scale: copy.scale ?? step.scale };
    case 'note':
      return { ...step, ...base, type: 'note', placeholder: copy.placeholder ?? step.placeholder, suggestions: copy.suggestions ?? step.suggestions };
  }
}

/** Return a display-only copy; IDs, flags, rewards and the stored game data remain unchanged. */
export function localizeMission<T extends Mission>(mission: T, language: Language): T {
  // Special missions have their own Persian map so the six-mission coverage test stays exact.
  const copy = language === 'fa' ? PERSIAN_MISSIONS[mission.id] ?? PERSIAN_SPECIAL_MISSIONS[mission.id] : undefined;
  if (!copy) return mission;
  return {
    ...mission,
    title: copy.title,
    shortTitle: copy.shortTitle,
    description: copy.description,
    steps: mission.steps.map((step) => localizeStep(step, copy.steps[step.id])),
  };
}

export function localizeMissionView(view: MissionView, progress: PlayerProgress, language: Language, catalog?: readonly Mission[]): MissionView {
  const localized = localizeMission(view, language);
  if (language === 'en' || !view.lockReason) return localized;
  // Translate the server's locked status without recomputing whether it is locked.
  const after = view.unlock.afterMission;
  if (after && !(progress.missions[after]?.completions > 0)) {
    const requiredMission = catalog?.find((item) => item.id === after) ?? getMission(after);
    return { ...localized, lockReason: translate(language, 'missions.lockMission', { mission: requiredMission ? localizeMission(requiredMission, language).title : after }) };
  }
  if (view.unlock.minLevel) {
    return { ...localized, lockReason: translate(language, 'missions.lockLevel', { level: view.unlock.minLevel }) };
  }
  return localized;
}

export function categoryLabel(category: MissionCategory, language: Language, categories: Record<MissionCategory, CategoryMeta> = CATEGORIES): string {
  return language === 'fa' ? PERSIAN_CATEGORIES[category] ?? categories[category].label : categories[category].label;
}

export function difficultyLabel(difficulty: MissionDifficulty, language: Language, difficulties: Record<MissionDifficulty, { label: string; dots: number }> = DIFFICULTY): string {
  return language === 'fa' ? PERSIAN_DIFFICULTIES[difficulty] ?? difficulties[difficulty].label : difficulties[difficulty].label;
}

export function levelTitle(level: number, language: Language, levels?: readonly LevelDef[]): string {
  return language === 'fa' ? PERSIAN_LEVELS[level] ?? getLevelDef(level, levels).title : getLevelDef(level, levels).title;
}

export function localizeAchievement<T extends AchievementMeta>(achievement: T, language: Language): T {
  const copy = language === 'fa' ? PERSIAN_ACHIEVEMENTS[achievement.id] : undefined;
  return copy ? { ...achievement, ...copy } : achievement;
}

export function rewardLabel(line: RewardLine, language: Language): string {
  return language === 'fa' ? PERSIAN_REWARDS[line.ruleId] ?? line.label : line.label;
}
