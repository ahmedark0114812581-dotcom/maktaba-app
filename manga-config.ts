// ================= مانیجا — مدل البيانات والمنافذ =================

// بيانات مانيجا واحدة (من السيرفر)
export type Manga = {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  status: 'ongoing' | 'completed' | 'on_hiatus';
  chapters: Chapter[];
};

// فصل/كتاب من مانيجا
export type Chapter = {
  id: string;
  title: string;
  pageUrls: string[]; // روابط الصفحات
  volume: string;
  chapter: string;
  date?: string;
  pagesCount: number;
};

// مصدر مانيجا (الموقع)
export type MangaSource = {
  id: string;
  name: string;
  domain: string;
  // مصطلحات CSS لعرض الجدول الرئيسي (مينا فئة واحدة)
  listSelectors: {
    list: string; // المSelector لكل مانيجا
    title: string;
    cover: string;
    description: string;
    status: string;
  };
  // دوال ديناميكية لإستخراج الفصول والصفحات
  getChapters: (html: string, baseUrl: string) => Chapter[];
  getPages: (html: string, baseUrl: string) => string[];
};

// مصادرة افتراضية (يجب استبدالها بموقع حقيقي)
export const defaultSource: MangaSource = {
  id: 'demo',
  name: 'موقع تجريبي',
  domain: 'example.com',
  listSelectors: {
    list: 'div.manga-card',
    title: 'h3 a',
    cover: 'img',
    description: 'p.description',
    status: 'span.status',
  },
  getChapters: (html, baseUrl) => {
    // سنتجاوزها لاحقاً
    return [];
  },
  getPages: (html, baseUrl) => {
    return [];
  },
};
