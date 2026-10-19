import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  getLocalVideoUri, downloadVideo, deleteLocalVideo, getDownloadsList,
  isSubscribed, activateCode, registerDownload, removeDownload, isWeb,
  isLockEnabled, setLockEnabled, authenticateWithBiometrics,
} from './storage';

const { width: screenWidth } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// وضع لوحة التحكم (تطبيق منفصل بيفتح لوحة التحكم في WebView)
const ADMIN_MODE = process.env.EXPO_PUBLIC_ADMIN_MODE === 'true';

// الفيديوهات المرفوعة على السيرفر بتتخزن كرابط نسبي (/uploads/x.mp4) — هنا بنحوّله لرابط كامل
function resolveUrl(u: string): string {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}

// تحويل الثواني لصيغة m:ss
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ============ زر التحميل ============
function DownloadButton({
  video, premium, progress, onPress, t,
}: {
  video: VideoItem;
  premium: boolean;
  progress?: number;
  onPress: () => void;
  t: Theme;
}) {
  const isDownloading = progress !== undefined;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.downloadBtn,
        { backgroundColor: isDownloading ? t.mint : premium ? t.btn : t.mint, borderColor: t.border },
      ]}
      onPress={onPress}
    >
      {isDownloading ? (
        <View style={styles.downloadProgressTrack}>
          <View
            style={[
              styles.downloadProgressFill,
              { width: `${Math.round((progress as number) * 100)}%`, backgroundColor: t.accent },
            ]}
          />
        </View>
      ) : (
        <Text style={[styles.downloadBtnText, { color: premium ? '#FFFFFF' : t.textSecondary }]}>
          {premium ? '⬇ تحميل' : '🔒 تحميل'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ============ الإعلانات ============
// رابط الإعلان بيتحد من .env (EXPO_PUBLIC_AD_URL) — من لوحة التحكم في Monetag
function AdModal({ visible, onClose, t, adUrl }: { visible: boolean; onClose: () => void; t: Theme; adUrl: string }) {
  if (!adUrl) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.adOverlay, { backgroundColor: 'rgba(0,0,0,0.94)' }]}>
        <View style={styles.adHeader}>
          <Text style={[styles.adBadge, { color: '#999' }]}>إعلان</Text>
          <TouchableOpacity onPress={onClose} style={styles.adCloseBtn} activeOpacity={0.7}>
            <Text style={styles.adCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: adUrl }}
          style={styles.adWeb}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit
          originWhitelist={['*']}
          mixedContentMode="always"
        />
      </View>
    </Modal>
  );
}

// ============ THEMES ============
const themes = {
  light: {
    bg: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    card: '#FFFFFF',
    mint: '#E8F5E9',
    accent: '#2E7D32',
    btn: '#43A047',
    border: '#E0E0E0',
    tabBar: '#FFFFFF',
    bannerFrom: '#1B5E20',
    bannerTo: '#43A047',
    bannerText: '#FFFFFF',
  },
  dark: {
    bg: '#2A0848',
    text: '#FFD85E',
    textSecondary: '#B8A9C9',
    card: '#240B45',
    mint: '#1E0A38',
    accent: '#FFD85E',
    btn: '#661733',
    border: '#3D1A6B',
    tabBar: '#240B45',
    bannerFrom: '#023B1A',
    bannerTo: '#14B866',
    bannerText: '#FFFFFF',
  },
  premium: {
    bg: '#1C1C1C',
    text: '#F5F5F0',
    textSecondary: '#999999',
    card: '#2A2A2A',
    mint: '#242424',
    accent: '#C9A227',
    btn: '#C9A227',
    border: '#3A3A3A',
    tabBar: '#2A2A2A',
    bannerFrom: '#2D1B4E',
    bannerTo: '#1E1230',
    bannerText: '#F5F5F0',
  },
};

type ThemeKey = keyof typeof themes;
type Theme = typeof themes.light;

// ============ DATA ============
const folders = [
  { id: 1, name: 'رياضيات', count: 12, color: '#FF2F93' },
  { id: 2, name: 'كيمياء', count: 8, color: '#00D4FF' },
  { id: 3, name: 'فيزياء', count: 15, color: '#FFD700' },
  { id: 4, name: 'لغة عربية', count: 20, color: '#00FF88' },
  { id: 5, name: 'تاريخ', count: 6, color: '#FF6B35' },
  { id: 6, name: 'جغرافيا', count: 4, color: '#9B59B6' },
];

const sampleVideos = [
  { id: 1, title: 'مقدمة في البرمجة', duration: '0:10', views: '546', folderId: 1, url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', isVertical: false },
  { id: 2, title: 'أساسيات التصميم', duration: '0:10', views: '115', folderId: 1, url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4', isVertical: false },
  { id: 3, title: 'تعلم الربح من الإنترنت', duration: '0:10', views: '89', folderId: 2, url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4', isVertical: false },
  { id: 4, title: 'أفضل تطبيقات 2025', duration: '0:05', views: '67', folderId: 3, url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', isVertical: true },
  { id: 5, title: 'مراجعة هاتف جديد', duration: '0:13', views: '45', folderId: 4, url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4', isVertical: false },
  { id: 6, title: 'سرعة الإنجاز', duration: '0:06', views: '34', folderId: 5, url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4', isVertical: true },
  { id: 7, title: 'شرح المعادلات', duration: '0:10', views: '234', folderId: 1, url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_2MB.mp4', isVertical: false },
  { id: 8, title: 'الجدول الدوري', duration: '0:08', views: '178', folderId: 2, url: 'https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4', isVertical: false },
];

type VideoItem = typeof sampleVideos[0];

type FolderItem = { id: number; name: string; count: number; color: string };

const FOLDER_COLORS = ['#FF2F93', '#00D4FF', '#FFD700', '#00FF88', '#FF6B35', '#9B59B6', '#2E7D32', '#1565C0', '#E91E63', '#009688'];

const HOME_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'hot', label: 'رائج' },
  { id: 'new', label: 'حديث' },
] as const;

// ============ شاشة المشغل ============
function PlayerScreen({
  video,
  allVideos,
  t,
  onBack,
  onSelectVideo,
  onWatched,
}: {
  video: VideoItem;
  allVideos: VideoItem[];
  t: Theme;
  onBack: () => void;
  onSelectVideo: (v: VideoItem) => void;
  onWatched: () => void;
}) {
  const videoViewRef = useRef<VideoView>(null);

  const player = useVideoPlayer({ uri: resolveUrl(video.url) }, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
    p.play();
    onWatched();
  });

  // لو الفيديو محمل على الجهاز → نشغله من الملف المحلي (بدون نت)
  const [localUri, setLocalUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uri = await getLocalVideoUri(video.id);
      if (!cancelled && uri && player) {
        setLocalUri(uri);
        try { player.replace({ uri }); } catch (e) { /* تجاهل */ }
      }
    })();
    return () => { cancelled = true; };
  }, [video.id]);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const timeUpdate = useEvent(player, 'timeUpdate');
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  const currentTime = timeUpdate?.currentTime ?? 0;
  const duration = player.duration || 0;
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const isLoading = status === 'loading';
  const hasError = status === 'error';

  const handleEnd = useCallback(() => {
    const idx = allVideos.findIndex((v) => v.id === video.id);
    if (idx >= 0 && idx < allVideos.length - 1) {
      onSelectVideo(allVideos[idx + 1]);
    }
  }, [allVideos, video.id, onSelectVideo]);

  useEffect(() => {
    const sub = player.addListener('playToEnd', handleEnd);
    return () => sub.remove();
  }, [player, handleEnd]);

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
  };

  const playerHeight = video.isVertical ? 340 : screenWidth * 0.5625;

  return (
    <View style={[styles.playerContainer, { backgroundColor: t.bg }]}>
      <TouchableOpacity style={styles.playerBack} onPress={onBack}>
        <Text style={[styles.playerBackText, { color: t.accent }]}>←</Text>
      </TouchableOpacity>

      <View style={[styles.playerVideo, { height: playerHeight }]}>
        <VideoView
          ref={videoViewRef}
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: true, orientation: 'landscape' }}
          allowsPictureInPicture
        />

        {isLoading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>⏳ جاري التحميل...</Text>
          </View>
        )}

        {hasError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <Text style={styles.loadingText}>⚠️ تعذر تشغيل الفيديو</Text>
          </View>
        )}

        {!isPlaying && !isLoading && (
          <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
            <Text style={styles.playBtnText}>▶</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.playerControls}>
        <TouchableOpacity onPress={() => player.seekBy(-10)} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: t.text }]}>⏪</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlay} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: t.text }]}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => player.seekBy(10)} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: t.text }]}>⏩</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => videoViewRef.current?.enterFullscreen()} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: t.text }]}>⛶</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.progressBar, { backgroundColor: t.mint }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: t.accent }]} />
      </View>

      <View style={styles.playerInfo}>
        <Text style={[styles.playerTitle, { color: t.text }]}>{video.title}</Text>
        <Text style={[styles.playerViews, { color: t.textSecondary }]}>
          {video.views} مشاهدة{video.isVertical ? ' • 📱 عمودي' : ''}
        </Text>
        <Text style={[styles.playerTime, { color: t.accent }]}>
          ⏱ {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ''}
        </Text>
      </View>

      <Text style={[styles.suggestedTitle, { color: t.text }]}>فيديوهات مقترحة</Text>
      <FlatList
        data={allVideos.filter((v) => v.id !== video.id).slice(0, 6)}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.suggestedGrid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.suggestedCard} onPress={() => onSelectVideo(item)}>
            <View style={[styles.suggestedThumb, { backgroundColor: t.mint }]}>
              <Text style={[styles.suggestedPlayIcon, { color: t.accent }]}>
                {item.isVertical ? '📱' : '▶'}
              </Text>
              <Text style={styles.videoDuration}>{item.duration}</Text>
            </View>
            <Text style={[styles.suggestedVideoTitle, { color: t.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ============ وضع لوحة التحكم ============
function AdminApp() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#0e1116' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0e1116" />
      <WebView
        source={{ uri: API_URL }}
        style={{ flex: 1, marginTop: insets.top }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        originWhitelist={['*']}
        mixedContentMode="always"
        renderLoading={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0e1116' }}>
            <ActivityIndicator size="large" color="#43A047" />
            <Text style={{ color: '#8b949e', marginTop: 12 }}>⏳ جاري التحميل...</Text>
          </View>
        )}
      />
    </View>
  );
}

// ============ التطبيق ============
export default function App() {
  if (ADMIN_MODE) {
    return (
      <SafeAreaProvider>
        <AdminApp />
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [homeTab, setHomeTab] = useState<'all' | 'hot' | 'new'>('all');
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [theme, setTheme] = useState<ThemeKey>('light');
  const [requestText, setRequestText] = useState('');
  const [premium, setPremium] = useState(false);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [showActivation, setShowActivation] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [activationMsg, setActivationMsg] = useState('');
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [videosWatched, setVideosWatched] = useState(0);
  const [adUrl, setAdUrl] = useState('');

  // جلب الإعدادات من السيرفر (رابط الإعلان)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/config`);
        const j = await r.json();
        if (!cancelled && j.adUrl) setAdUrl(j.adUrl);
      } catch (e) { /* تجاهل */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [requests, setRequests] = useState([
    { id: 1, text: 'شرح المعادلات من الصفر', status: 'قيد المراجعة' },
    { id: 2, text: 'الجدول الدوري مبسط', status: 'تم النشر' },
    { id: 3, text: 'قوانين نيوتن', status: 'قيد التنفيذ' },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // صورة البانر: بنجيبها من السيرفر لو موجودة (عشان تتغير من غير إعادة بناء التطبيق)
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const url = `${API_URL}/banner.jpg`;
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled && r.ok) setBannerUri(`${url}?v=${Date.now()}`);
      })
      .catch(() => { /* هنستخدم الصورة المدمجة */ });
    return () => { cancelled = true; };
  }, []);

  const bannerSource = bannerUri ? { uri: bannerUri } : require('./assets/banner.png');

  // بيانات الملفات والفيديوهات: من السيرفر لو فيها فيديوهات، وإلا البيانات المدمجة
  const [foldersData, setFoldersData] = useState<FolderItem[]>(folders);
  const [videosData, setVideosData] = useState<VideoItem[]>(sampleVideos);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fRes, vRes] = await Promise.all([
          fetch(`${API_URL}/api/files`),
          fetch(`${API_URL}/api/videos?limit=200`),
        ]);
        if (!fRes.ok || !vRes.ok) return;
        const fJson = await fRes.json();
        const vJson = await vRes.json();
        const vids: any[] = Array.isArray(vJson) ? vJson : (vJson.data || []);
        if (cancelled || vids.length === 0) return; // مفيش فيديوهات على السيرفر → نفضل على البيانات المدمجة
        const flist: any[] = Array.isArray(fJson) ? fJson : [];
        setFoldersData(
          flist.map((f, i) => ({
            id: Number(f.id),
            name: String(f.name ?? ''),
            count: Number(f.count ?? 0),
            color: FOLDER_COLORS[i % FOLDER_COLORS.length],
          }))
        );
        setVideosData(
          vids.map((v) => ({
            id: Number(v.id),
            title: String(v.title ?? ''),
            duration: String(v.duration ?? '0:00'),
            views: String(v.views ?? 0),
            folderId: Number(v.folderId ?? v.fileId ?? 0),
            url: String(v.playUrl || v.url || ''),
            isVertical: Boolean(v.isVertical),
          }))
        );
      } catch (e) { /* نستخدم البيانات المدمجة */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // حالة الاشتراك + قائمة التحميلات
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sub = await isSubscribed();
        if (!cancelled) setPremium(sub);
        const dl = await getDownloadsList();
        if (!cancelled) setDownloads(dl);
      } catch (e) { /* تجاهل */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ============ قفل البصمة ============
  useEffect(() => {
    (async () => {
      try {
        const enabled = await isLockEnabled();
        setLockEnabledState(enabled);
        if (enabled) setLocked(true);
      } catch (e) { /* تجاهل */ }
    })();
  }, []);

  const handleUnlock = useCallback(async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) setLocked(false);
  }, []);

  const handleToggleLock = useCallback(async (on: boolean) => {
    if (on) {
      const ok = await authenticateWithBiometrics();
      if (!ok) { alert('⚠️ بصمة مش متسجلة على الجهاز'); return; }
      await setLockEnabled(true);
      setLockEnabledState(true);
    } else {
      await setLockEnabled(false);
      setLockEnabledState(false);
    }
  }, []);

  // ============ الإعلانات ============
  // ٧٠% عند فتح التطبيق (للغير مشتركين)
  useEffect(() => {
    if (showSplash) return;
    if (premium) return;
    if (Math.random() < 0.7) {
      const timer = setTimeout(() => setShowAd(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [showSplash, premium]);

  // كل ٤ فيديوهات → إعلان
  const handleVideoWatched = useCallback(() => {
    if (premium) return;
    setVideosWatched((n) => {
      const next = n + 1;
      if (next % 4 === 0) {
        setTimeout(() => setShowAd(true), 600);
      }
      return next;
    });
  }, [premium]);

  const refreshDownloads = useCallback(async () => {
    try { setDownloads(await getDownloadsList()); } catch (e) { /* تجاهل */ }
  }, []);

  // ============ التحميل ============
  const handleDownload = useCallback(async (video: VideoItem) => {
    if (downloading[video.id] !== undefined) return;
    setDownloading((d) => ({ ...d, [video.id]: 0 }));
    try {
      await downloadVideo(video, (p) =>
        setDownloading((d) => ({ ...d, [video.id]: p }))
      );
      // نجيب الحجم ونسجل على السيرفر
      const uri = await getLocalVideoUri(video.id);
      let size = 0;
      try {
        const info = await FileSystem.getInfoAsync(uri!);
        if (info.exists && (info as any).size) size = (info as any).size;
      } catch (e) { /* تجاهل */ }
      await registerDownload(video.id, video.title, size);
      await refreshDownloads();
    } catch (e) {
      alert('⚠️ فشل تحميل الفيديو — حاول تاني');
    } finally {
      setDownloading((d) => { const n = { ...d }; delete n[video.id]; return n; });
    }
  }, [downloading, refreshDownloads]);

  const handleDeleteDownload = useCallback(async (item: any) => {
    try {
      await deleteLocalVideo(item.videoId);
      await removeDownload(item.id);
      await refreshDownloads();
    } catch (e) { /* تجاهل */ }
  }, [refreshDownloads]);

  // التحقق من كود
  const handleActivate = useCallback(async () => {
    if (activationCode.trim().length < 4) {
      setActivationMsg('⚠️ الكود قصير جداً');
      return;
    }
    setActivationMsg('⏳ جاري التحقق...');
    const res = await activateCode(activationCode.trim());
    if (res.valid) {
      setActivationMsg('✅ تم تفعيل الاشتراك! استمتع');
      setPremium(true);
      setActivationCode('');
    } else {
      setActivationMsg('❌ ' + (res.reason || 'الكود غير صحيح'));
    }
  }, [activationCode]);

  const t = themes[theme];

  const shownFolders = useMemo(() => {
    const list = [...foldersData];
    if (homeTab === 'hot') list.sort((a, b) => b.count - a.count);
    if (homeTab === 'new') list.sort((a, b) => b.id - a.id);
    return list;
  }, [homeTab, foldersData]);

  // ============ قفل البصمة ============
  if (locked) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />
        <Text style={{ fontSize: 52 }}>🔒</Text>
        <Text style={[styles.lockTitle, { color: t.text }]}>المكتبة مقفلة</Text>
        <Text style={[styles.lockSub, { color: t.textSecondary }]}>استخدم بصمتك للدخول</Text>
        <TouchableOpacity style={[styles.lockBtn, { backgroundColor: t.accent }]} onPress={handleUnlock} activeOpacity={0.85}>
          <Text style={styles.lockBtnText}>🔓 فتح بالبصمة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============ SPLASH ============
  if (showSplash) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />
        <Image source={require('./assets/logo.png')} style={styles.splashLogo} resizeMode="contain" />
        <Text style={[styles.splashTitle, { color: t.text }]}>المكتبة</Text>
        <Text style={[styles.splashSub, { color: t.textSecondary }]}>فيديوهات تعليمية</Text>
      </View>
    );
  }

  // ============ PLAYER ============
  if (selectedVideo) {
    return (
      <PlayerScreen
        key={selectedVideo.id}
        video={selectedVideo}
        allVideos={videosData}
        t={t}
        onWatched={handleVideoWatched}
        onBack={() => {
          setSelectedVideo(null);
          setActiveTab(selectedFolder ? 'folder' : 'home');
        }}
        onSelectVideo={(v) => setSelectedVideo(v)}
      />
    );
  }

  // ============ FOLDER ============
  const renderFolder = () => {
    if (!selectedFolder) return null;
    const folderVideos = videosData.filter((v) => v.folderId === selectedFolder.id);
    return (
      <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.folderHeader}>
          <TouchableOpacity onPress={() => { setSelectedFolder(null); setActiveTab('home'); }}>
            <Text style={[styles.backBtn, { color: t.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.folderHeaderTitle, { color: t.text }]}>{selectedFolder.name}</Text>
        </View>

        {folderVideos.length === 0 ? (
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>مفيش فيديوهات في الملف ده لسه</Text>
        ) : (
          <View style={styles.grid}>
            {folderVideos.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={[styles.videoCard, { backgroundColor: t.card, borderColor: t.border }]}
                onPress={() => setSelectedVideo(video)}
              >
                <View style={[styles.videoThumb, { backgroundColor: t.mint }]}>
                  <Text style={[styles.videoPlayIcon, { color: t.accent }]}>
                    {video.isVertical ? '📱' : '▶'}
                  </Text>
                  <Text style={styles.videoDuration}>{video.duration}</Text>
                </View>
                <View style={styles.videoMeta}>
                  <Text style={[styles.videoTitle, { color: t.text }]} numberOfLines={2}>{video.title}</Text>
                  <Text style={[styles.videoViews, { color: t.textSecondary }]}>{video.views} مشاهدة</Text>
                </View>
                <DownloadButton
                  video={video}
                  premium={true}
                  progress={downloading[video.id]}
                  t={t}
                  onPress={() => handleDownload(video)}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };

  // ============ HOME ============
  const renderHome = () => (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.homeTop}>
        <Image source={require('./assets/icon.png')} style={[styles.avatar, { borderColor: t.accent }]} />
        <Text style={[styles.homeTitle, { color: t.text }]}>المكتبة 🔥</Text>
      </View>

      <TouchableOpacity onPress={() => setActiveTab('subscription')} activeOpacity={0.9}>
        <View style={styles.banner}>
          {/* صورة بنر التطبيق — بتتغير من لوحة التحكم */}
          <Image source={bannerSource} style={styles.bannerImg} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.75)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.bannerScrim}
          >
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>JOIN OUR MEMBERSHIP!</Text>
              <Text style={styles.bannerSub}>AD-Free • Play Acceleration</Text>
            </View>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Upgrade</Text>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      <View style={styles.tabs}>
        {HOME_TABS.map((tab) => (
          <TouchableOpacity key={tab.id} style={styles.tab} onPress={() => setHomeTab(tab.id)}>
            <Text style={[styles.tabText, { color: homeTab === tab.id ? t.accent : t.textSecondary }]}>
              {tab.label}
            </Text>
            <View
              style={[
                styles.tabUnderline,
                { backgroundColor: homeTab === tab.id ? t.accent : 'transparent' },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {shownFolders.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={[styles.folderCard, { backgroundColor: t.card, borderColor: t.border }]}
            onPress={() => { setSelectedFolder(folder); setActiveTab('folder'); }}
            activeOpacity={0.85}
          >
            <View style={[styles.folderThumb, { backgroundColor: t.mint }]}>
              <Text style={styles.folderThumbIcon}>📁</Text>
              <Text style={[styles.folderThumbName, { color: t.accent }]} numberOfLines={1}>
                {folder.name}
              </Text>
            </View>
            <View style={styles.folderMeta}>
              <Text style={[styles.folderCount, { color: t.text }]}>{folder.count}</Text>
              <Text style={[styles.folderCountLabel, { color: t.textSecondary }]}>فيديو</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // ============ REQUESTS ============
  const renderRequests = () => (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: t.text }]}>طلباتكم</Text>
      <TextInput
        style={[styles.requestInput, { backgroundColor: t.card, color: t.text, borderColor: t.border }]}
        placeholder="اكتب الفيديو اللي عايزه..."
        placeholderTextColor={t.textSecondary}
        multiline
        value={requestText}
        onChangeText={setRequestText}
      />
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: t.accent, opacity: requestText.trim().length >= 3 ? 1 : 0.5 }]}
        disabled={requestText.trim().length < 3}
        onPress={() => {
          setRequests([{ id: Date.now(), text: requestText.trim(), status: 'قيد المراجعة' }, ...requests]);
          setRequestText('');
        }}
      >
        <Text style={styles.submitBtnText}>إرسال</Text>
      </TouchableOpacity>
      <Text style={[styles.sectionTitle, { color: t.text }]}>طلباتي</Text>
      {requests.map((req) => (
        <View key={req.id} style={[styles.requestCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.requestText, { color: t.text }]}>{req.text}</Text>
          <Text style={[styles.requestStatus, { color: t.accent }]}>{req.status}</Text>
        </View>
      ))}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // ============ SUBSCRIPTION ============
  const renderSubscription = () => (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: t.text }]}>الاشتراك</Text>
      <Text style={[styles.subSub, { color: t.textSecondary }]}>اختر الخطة المناسبة لك</Text>
      {[
        { name: 'شهري', price: '$1.99', features: 'بدون إعلانات • مشاهدة أسرع' },
        { name: 'سنوي', price: '$14.99', features: 'بدون إعلانات • مشاهدة أسرع • توفير 30%' },
        { name: 'مدى الحياة', price: '$29.99', features: 'بدون إعلانات • مشاهدة أسرع • دفع مرة واحدة' },
      ].map((plan, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.planCard, { backgroundColor: t.card, borderColor: t.border }]}
        >
          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: t.text }]}>{plan.name}</Text>
            <Text style={[styles.planFeatures, { color: t.textSecondary }]}>{plan.features}</Text>
          </View>
          <Text style={[styles.planPrice, { color: t.accent }]}>{plan.price}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // ============ MORE ============
  const renderMore = () => (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: t.text }]}>المزيد</Text>

      <Text style={[styles.moreSectionTitle, { color: t.textSecondary }]}>المظهر</Text>
      <View style={styles.themeRow}>
        {([
          { id: 'light' as ThemeKey, name: 'فاتح', icon: '☀️' },
          { id: 'dark' as ThemeKey, name: 'داكن', icon: '🌙' },
          { id: 'premium' as ThemeKey, name: 'بريميوم', icon: '⭐' },
        ]).map((th) => (
          <TouchableOpacity
            key={th.id}
            style={[
              styles.themeBtn,
              { backgroundColor: theme === th.id ? t.accent : t.card, borderColor: t.border },
            ]}
            onPress={() => setTheme(th.id)}
          >
            <Text style={styles.themeBtnIcon}>{th.icon}</Text>
            <Text style={[styles.themeBtnText, { color: theme === th.id ? '#FFFFFF' : t.text }]}>
              {th.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.moreSectionTitle, { color: t.textSecondary }]}>الحساب</Text>
      {[
        { icon: '👤', label: 'الحساب' },
        { icon: '⚙️', label: 'الإعدادات' },
        { icon: 'ℹ️', label: 'عن التطبيق' },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={[styles.moreItem, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={styles.moreIcon}>{item.icon}</Text>
          <Text style={[styles.moreText, { color: t.text }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.moreSectionTitle, { color: t.textSecondary }]}>الأمان</Text>
      <TouchableOpacity
        style={[styles.moreItem, { backgroundColor: t.card, borderColor: t.border }]}
        onPress={() => handleToggleLock(!lockEnabled)}
      >
        <Text style={styles.moreIcon}>🔒</Text>
        <Text style={[styles.moreText, { color: t.text }]}>قفل البصمة</Text>
        <View style={[styles.toggleTrack, { backgroundColor: lockEnabled ? t.accent : t.border }]}>
          <View style={[styles.toggleThumb, { alignSelf: lockEnabled ? 'flex-end' : 'flex-start' }]} />
        </View>
      </TouchableOpacity>
      <Text style={[styles.lockHint, { color: t.textSecondary }]}>
        {lockEnabled ? '🔒 التطبيق مقفل بالبصمة' : '🔓 التطبيق مفتوح — مفيش قفل'}
      </Text>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // ============ التحميلات ============
  const renderDownloads = () => {
    const totalSize = downloads.reduce((a, d) => a + (Number(d.size) || 0), 0);
    return (
      <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: t.text }]}>التحميلات</Text>
        <Text style={[styles.subSub, { color: t.textSecondary }]}>
          {downloads.length} فيديو • {(totalSize / 1024 / 1024).toFixed(1)} MB
        </Text>
        {downloads.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>📥</Text>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>مفيش فيديوهات محملة لسه</Text>
            <Text style={[styles.emptyHint, { color: t.textSecondary }]}>اضغط زر ⬇ على أي فيديو (للمشتركين)</Text>
          </View>
        ) : (
          downloads.map((item: any) => (
            <View key={item.id} style={[styles.downloadCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.downloadTitle, { color: t.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.downloadMeta, { color: t.textSecondary }]}>
                  {((Number(item.size) || 0) / 1024 / 1024).toFixed(1)} MB
                </Text>
              </View>
              <TouchableOpacity style={[styles.downloadDel, { backgroundColor: t.mint }]} onPress={() => handleDeleteDownload(item)}>
                <Text style={{ color: '#D32F2F', fontWeight: '700' }}>حذف</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };

  // ============ تفعيل الاشتراك ============
  const renderActivation = () => (
    <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: t.text }]}>تفعيل الاشتراك</Text>
      <Text style={[styles.subSub, { color: t.textSecondary }]}>اكتب الكود اللي استلمته</Text>
      <TextInput
        style={[styles.codeInput, { backgroundColor: t.card, color: t.text, borderColor: t.border }]}
        placeholder="مثال: AHMED2026"
        placeholderTextColor={t.textSecondary}
        autoCapitalize="characters"
        value={activationCode}
        onChangeText={setActivationCode}
      />
      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: t.accent }]} onPress={handleActivate}>
        <Text style={styles.submitBtnText}>تفعيل</Text>
      </TouchableOpacity>
      {activationMsg ? (
        <Text style={[styles.activationMsg, { color: activationMsg.indexOf('✅') === 0 ? '#43A047' : '#D32F2F' }]}>{activationMsg}</Text>
      ) : null}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // ============ MAIN ============
  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />

      {activeTab === 'home' && renderHome()}
      {activeTab === 'folder' && selectedFolder && renderFolder()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'subscription' && renderSubscription()}
      {activeTab === 'downloads' && renderDownloads()}
      {activeTab === 'activation' && renderActivation()}
      {activeTab === 'more' && renderMore()}

      <View style={[styles.tabBar, { backgroundColor: t.tabBar, borderTopColor: t.border, paddingBottom: 8 + insets.bottom }]}>
        {[
          { id: 'home', icon: '🏠', label: 'الرئيسية' },
          { id: 'downloads', icon: '⬇️', label: 'التحميلات' },
          { id: 'subscription', icon: '⭐', label: 'الاشتراك' },
          { id: 'activation', icon: '🔑', label: 'تفعيل' },
          { id: 'more', icon: '☰', label: 'المزيد' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => { setActiveTab(tab.id); if (tab.id !== 'folder') setSelectedFolder(null); }}
          >
            <Text style={[styles.tabIcon, activeTab === tab.id && { color: t.accent }]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? t.accent : t.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* الإعلانات */}
      <AdModal visible={showAd} onClose={() => setShowAd(false)} t={t} adUrl={adUrl} />
    </View>
  );
}

const CARD_W = (screenWidth - 44) / 2;

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Splash
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 160, height: 160, marginBottom: 20 },
  splashTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  splashSub: { fontSize: 16 },
  // Home top (avatar + title)
  homeTop: { alignItems: 'center', paddingTop: 48, paddingBottom: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 2 },
  homeTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  // Banner (صورة + طبقة تعتيم + نص)
  banner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    height: 160,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: 16,
  },
  bannerTextWrap: { flex: 1, paddingRight: 8 },
  bannerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', fontStyle: 'italic' },
  bannerSub: { color: '#FFFFFF', fontSize: 11, marginTop: 4, opacity: 0.9 },
  bannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bannerBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  // Home tabs
  tabs: { flexDirection: 'row', paddingHorizontal: 18, marginTop: 14, marginBottom: 4 },
  tab: { marginRight: 26, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600', paddingBottom: 6 },
  tabUnderline: { height: 3, width: '100%', borderRadius: 2 },
  // ===== الشبكة (عمودين) =====
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 6 },
  // بطاقة الملف — شكل من الصورة
  folderCard: {
    width: CARD_W,
    margin: 6,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  folderThumb: {
    width: '100%',
    height: 132,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  folderThumbIcon: { fontSize: 36, marginBottom: 8 },
  folderThumbName: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  folderMeta: { paddingVertical: 14, alignItems: 'center' },
  folderCount: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  folderCountLabel: { fontSize: 12, marginTop: 2 },
  // Folder header
  folderHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { fontSize: 26, marginRight: 12 },
  folderHeaderTitle: { fontSize: 22, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  // Video cards
  videoCard: {
    width: CARD_W,
    margin: 6,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  videoThumb: { width: '100%', height: 132, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  videoPlayIcon: { fontSize: 38 },
  videoDuration: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.78)', color: '#FFFFFF',
    fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  videoMeta: { padding: 12 },
  videoTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  videoViews: { fontSize: 12, marginTop: 4 },
  // Player
  playerContainer: { flex: 1 },
  playerBack: { position: 'absolute', top: 48, left: 16, zIndex: 10, padding: 10 },
  playerBackText: { fontSize: 26 },
  playerVideo: { width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginTop: 48 },
  video: { width: '100%', height: '100%' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loadingText: { color: '#FFFFFF', marginTop: 8, fontSize: 13 },
  playBtn: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  playBtnText: { fontSize: 26, color: '#FFFFFF' },
  playerControls: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, gap: 22 },
  controlBtn: { padding: 8 },
  controlBtnText: { fontSize: 26 },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  playerInfo: { padding: 16 },
  playerTitle: { fontSize: 18, fontWeight: 'bold' },
  playerViews: { fontSize: 14, marginTop: 4 },
  playerTime: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  suggestedTitle: { fontSize: 17, fontWeight: 'bold', margin: 16 },
  suggestedGrid: { paddingHorizontal: 10 },
  suggestedCard: { width: CARD_W, margin: 6 },
  suggestedThumb: { width: '100%', height: 132, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  suggestedPlayIcon: { fontSize: 34 },
  suggestedVideoTitle: { fontSize: 14, fontWeight: '600', marginTop: 6, lineHeight: 19 },
  // Pages
  pageTitle: { fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 58 },
  subSub: { fontSize: 14, marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 16, marginTop: 24 },
  // Requests
  requestInput: { marginHorizontal: 16, padding: 12, borderRadius: 16, minHeight: 100, textAlignVertical: 'top', borderWidth: 1 },
  submitBtn: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  requestCard: {
    marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1,
  },
  requestText: { fontSize: 14, flex: 1 },
  requestStatus: { fontSize: 12, fontWeight: '600' },
  // Subscription
  planCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 18, borderWidth: 1,
  },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '600' },
  planFeatures: { fontSize: 12, marginTop: 4 },
  planPrice: { fontSize: 18, fontWeight: 'bold' },
  // More
  moreSectionTitle: { fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  themeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  themeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  themeBtnIcon: { fontSize: 20, marginBottom: 4 },
  themeBtnText: { fontSize: 12, fontWeight: '600' },
  moreItem: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 6,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  moreIcon: { fontSize: 20, marginRight: 12 },
  moreText: { fontSize: 16 },
  // التحميلات
  downloadCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 6,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  downloadTitle: { fontSize: 14, fontWeight: '600' },
  downloadMeta: { fontSize: 12, marginTop: 4 },
  downloadDel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  downloadBtn: {
    margin: 10, marginTop: 0, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', borderWidth: 1,
  },
  downloadBtnText: { fontSize: 12, fontWeight: '700' },
  downloadProgressTrack: { width: 90, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#E0E0E0' },
  downloadProgressFill: { height: '100%' },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyHint: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  codeInput: {
    marginHorizontal: 16, padding: 14, borderRadius: 14, fontSize: 18, fontWeight: '700',
    textAlign: 'center', letterSpacing: 2, borderWidth: 1,
  },
  activationMsg: { marginHorizontal: 16, marginTop: 14, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  // الإعلانات
  adOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  adHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 10,
  },
  adBadge: { fontSize: 12, fontWeight: '600' },
  adCloseBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  adCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  adWeb: { flex: 1, width: '100%', backgroundColor: '#FFFFFF' },
  // قفل البصمة
  lockContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  lockSub: { fontSize: 14, marginTop: 8, marginBottom: 28 },
  lockBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  lockBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  toggleTrack: { width: 46, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  lockHint: { fontSize: 11, marginHorizontal: 16, marginTop: 8 },
  // Tab Bar
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 22, marginBottom: 4 },
  tabLabel: { fontSize: 11 },
  bottomPadding: { height: 100 },
});
