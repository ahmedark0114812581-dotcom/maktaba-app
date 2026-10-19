/**
 * إعدادات ديناميكية — نفس المشروع، تطبيقين مختلفين:
 *   • المكتبة (التطبيق الأساسي)
 *   • لوحة التحكم (وضع الإدارة — WebView على لوحة التحكم)
 */
module.exports = ({ config }) => {
  const isAdmin = process.env.EXPO_PUBLIC_ADMIN_MODE === 'true';

  if (isAdmin) {
    return {
      ...config,
      name: 'لوحة التحكم',
      // الـ slug لازم يفضل نفسه عشان projectId يشتغل
      slug: config.slug || 'maktaba-app',
      version: '1.0.0',
      orientation: 'default',
      icon: './assets/icon.png',
      backgroundColor: '#0e1116',
      userInterfaceStyle: 'automatic',
      android: {
        ...config.android,
        package: 'com.maktaba.admin',
        versionCode: 1,
      },
      extra: {
        ...(config.extra || {}),
        adminMode: true,
      },
    };
  }

  return {
    ...config,
    name: 'المكتبة',
    slug: config.slug || 'maktaba-app',
    android: {
      ...config.android,
      package: 'com.maktaba.app',
    },
    extra: {
      ...(config.extra || {}),
      adminMode: false,
    },
  };
};
