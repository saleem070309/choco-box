/* ============================================
   Choco Box — Global Configuration
   ============================================
   هذا الملف يحتوي على الإعدادات الأساسية للموقع.
   عدّل القيم هنا ثم ارفع الملف على GitHub لتطبيقها
   على جميع المتصفحات.
   ============================================ */

window.CHOCO_CONFIG = {
  // رابط Google Apps Script Web App
  API_URL: 'https://script.google.com/macros/s/AKfycbxoRaKkmPuzFusdvzkTwXrAhVn4FfFXZFUheS7dftK9RGW7VE0G7rmPOQelMg5wy6wVCg/exec',

  // رقم واتساب للتواصل
  WHATSAPP: '962XXXXXXXXX',

  // رابط صفحة فيسبوك
  FACEBOOK: 'https://www.facebook.com/profile.php?id=61575311498498',

  // مفتاح Gemini API لشوكو المساعد الذكي
  GEMINI_API_KEY: '',

  // موديل Gemini المستخدم
  GEMINI_MODEL: 'gemini-2.0-flash',

  // كلمة مرور الأدمن الافتراضية
  ADMIN_PASSWORD: 'choco2026',

  // الإعدادات الافتراضية لأصوات الـ Intro (كما طلبت في الصورة)
  INTRO_SOUNDS: [
    { url: 'choco.mp3', delay: 3000, volume: 1 },
    { url: 'pop1.wav', delay: 900, volume: 1 },
    { url: 'pop2.wav', delay: 1900, volume: 1 }
  ]
};
