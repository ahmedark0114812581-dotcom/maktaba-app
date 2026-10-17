import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: screenWidth } = Dimensions.get('window');

// ============ THEMES ============
const themes = {
  light: {
    bg: '#FAF6EF',
    text: '#3E322A',
    card: '#F7F2E9',
    banner: ['#9E8D7D', '#C8B8A6'],
    btn: '#8B7DA6',
    accent: '#8B7DA6',
    textSecondary: '#8B7D6B',
    border: '#E0D5C7',
    tabBar: '#F7F2E9',
  },
  dark: {
    bg: '#2A0848',
    text: '#FFD85E',
    card: '#240B45',
    banner: ['#023B1A', '#14B866'],
    btn: '#661733',
    accent: '#FFD85E',
    textSecondary: '#B8A9C9',
    border: '#3D1A6B',
    tabBar: '#240B45',
  },
  premium: {
    bg: '#1C1C1C',
    text: '#F5F5F0',
    card: '#2A2A2A',
    banner: ['#2D1B4E', '#1E1230'],
    btn: '#C9A227',
    accent: '#C9A227',
    textSecondary: '#999999',
    border: '#3A3A3A',
    tabBar: '#2A2A2A',
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
  { id: 1, title: 'مقدمة في البرمجة', duration: '15:30', views: '546', folderId: 1, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', isVertical: false },
  { id: 2, title: 'أساسيات التصميم', duration: '12:45', views: '115', folderId: 1, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', isVertical: false },
  { id: 3, title: 'تعلم الربح من الإنترنت', duration: '18:20', views: '89', folderId: 2, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', isVertical: false },
  { id: 4, title: 'أفضل تطبيقات 2025', duration: '10:15', views: '67', folderId: 3, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', isVertical: true },
  { id: 5, title: 'مراجعة هاتف جديد', duration: '14:00', views: '45', folderId: 4, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', isVertical: false },
  { id: 6, title: 'سرعة الإنجاز', duration: '9:30', views: '34', folderId: 5, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', isVertical: true },
  { id: 7, title: 'شرح المعادلات', duration: '22:10', views: '234', folderId: 1, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', isVertical: false },
  { id: 8, title: 'الجدول الدوري', duration: '16:45', views: '178', folderId: 2, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', isVertical: false },
];

type VideoItem = typeof sampleVideos[0];

// ============ شاشة المشغل ============
function PlayerScreen({
  video,
  allVideos,
  t,
  onBack,
  onSelectVideo,
}: {
  video: VideoItem;
  allVideos: VideoItem[];
  t: Theme;
  onBack: () => void;
  onSelectVideo: (v: VideoItem) => void;
}) {
  const videoViewRef = useRef<VideoView>(null);

  // مشغل الفيديو (expo-video)
  const player = useVideoPlayer({ uri: video.url }, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
    p.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const timeUpdate = useEvent(player, 'timeUpdate');
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  const currentTime = timeUpdate?.currentTime ?? 0;
  const duration = player.duration || 0;
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const isLoading = status === 'loading';
  const hasError = status === 'error';

  // الانتقال التلقائي للفيديو التالي عند الانتهاء
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

      <View style={[styles.progressBar, { backgroundColor: t.card }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: t.accent }]} />
      </View>

      <View style={styles.playerInfo}>
        <Text style={[styles.playerTitle, { color: t.text }]}>{video.title}</Text>
        <Text style={[styles.playerViews, { color: t.textSecondary }]}>
          {video.views} مشاهدة{video.isVertical ? ' • 📱 عمودي' : ''}
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
            <View style={[styles.suggestedThumb, { backgroundColor: t.card }]}>
              <Text style={[styles.suggestedPlayIcon, { color: t.accent }]}>
                {item.isVertical ? '📱' : '▶'}
              </Text>
              <Text style={styles.videoDuration}>{item.duration}</Text>
            </View>
            <Text style={[styles.suggestedVideoTitle, { color: t.text }]}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ============ التطبيق ============
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedFolder, setSelectedFolder] = useState<typeof folders[0] | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [theme, setTheme] = useState<ThemeKey>('light');
  const [requestText, setRequestText] = useState('');
  const [requests, setRequests] = useState([
    { id: 1, text: 'شرح المعادلات من الصفر', status: 'قيد المراجعة' },
    { id: 2, text: 'الجدول الدوري مبسط', status: 'تم النشر' },
    { id: 3, text: 'قوانين نيوتن', status: 'قيد التنفيذ' },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const t = themes[theme];

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
        allVideos={sampleVideos}
        t={t}
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
    const folderVideos = sampleVideos.filter((v) => v.folderId === selectedFolder.id);
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
          <View style={styles.videoGrid}>
            {folderVideos.map((video) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => setSelectedVideo(video)}
              >
                <View style={[styles.videoThumb, { backgroundColor: t.card }]}>
                  <Text style={[styles.videoPlayIcon, { color: t.accent }]}>
                    {video.isVertical ? '📱' : '▶'}
                  </Text>
                  <Text style={styles.videoDuration}>{video.duration}</Text>
                </View>
                <Text style={[styles.videoTitle, { color: t.text }]} numberOfLines={2}>{video.title}</Text>
                <Text style={[styles.videoViews, { color: t.textSecondary }]}>{video.views} مشاهدة</Text>
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: t.text }]}>المكتبة</Text>
      </View>
      <TouchableOpacity
        style={[styles.membershipBanner, { backgroundColor: t.card, borderColor: t.btn }]}
        onPress={() => setActiveTab('subscription')}
      >
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerTitle, { color: t.accent }]}>انضم لاشتراك المكتبة!</Text>
          <Text style={[styles.bannerSub, { color: t.textSecondary }]}>بدون إعلانات • مشاهدة أسرع</Text>
        </View>
        <View style={[styles.bannerBtn, { backgroundColor: t.btn }]}>
          <Text style={styles.bannerBtnText}>ترقية</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.grid}>
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={[styles.folderCard, { backgroundColor: t.card, borderColor: t.border }]}
            onPress={() => { setSelectedFolder(folder); setActiveTab('folder'); }}
          >
            <View style={[styles.folderIcon, { backgroundColor: folder.color + '22' }]}>
              <Text style={[styles.folderIconText, { color: folder.color }]}>📁</Text>
            </View>
            <Text style={[styles.folderName, { color: t.text }]} numberOfLines={1}>{folder.name}</Text>
            <Text style={[styles.folderCount, { color: t.textSecondary }]}>{folder.count} فيديو</Text>
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
        <View key={req.id} style={[styles.requestCard, { backgroundColor: t.card }]}>
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
        <TouchableOpacity key={i} style={[styles.planCard, { backgroundColor: t.card, borderColor: t.border }]}>
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
            style={[styles.themeBtn, { backgroundColor: theme === th.id ? t.accent : t.card, borderColor: t.border }]}
            onPress={() => setTheme(th.id)}
          >
            <Text style={styles.themeBtnIcon}>{th.icon}</Text>
            <Text style={[styles.themeBtnText, { color: theme === th.id ? '#FFFFFF' : t.text }]}>{th.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.moreSectionTitle, { color: t.textSecondary }]}>الحساب</Text>
      {[
        { icon: '👤', label: 'الحساب' },
        { icon: '⚙️', label: 'الإعدادات' },
        { icon: 'ℹ️', label: 'عن التطبيق' },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={[styles.moreItem, { backgroundColor: t.card }]}>
          <Text style={styles.moreIcon}>{item.icon}</Text>
          <Text style={[styles.moreText, { color: t.text }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
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
      {activeTab === 'more' && renderMore()}

      <View style={[styles.tabBar, { backgroundColor: t.tabBar, borderTopColor: t.border }]}>
        {[
          { id: 'home', icon: '🏠', label: 'الرئيسية' },
          { id: 'requests', icon: '📩', label: 'طلباتكم' },
          { id: 'subscription', icon: '⭐', label: 'الاشتراك' },
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
  // Header
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  // Banner
  membershipBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginVertical: 10, padding: 16, borderRadius: 16, borderWidth: 1,
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: 'bold' },
  bannerSub: { fontSize: 12, marginTop: 4 },
  bannerBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bannerBtnText: { color: '#FFFFFF', fontWeight: '600' },
  // ===== شبكة الملفات (أكبر وأرتب) =====
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 6 },
  folderCard: {
    width: CARD_W,
    margin: 6,
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  folderIcon: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  folderIconText: { fontSize: 42 },
  folderName: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  folderCount: { fontSize: 13, textAlign: 'center', marginTop: 6 },
  // Folder header
  folderHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { fontSize: 26, marginRight: 12 },
  folderHeaderTitle: { fontSize: 22, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  // ===== شبكة الفيديوهات (أكبر) =====
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 4 },
  videoCard: { width: CARD_W, margin: 6 },
  videoThumb: {
    width: '100%', height: 150, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
    shadowColor: '#000000', shadowOpacity: 0.10, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  videoPlayIcon: { fontSize: 38 },
  videoDuration: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.78)', color: '#FFFFFF',
    fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  videoTitle: { fontSize: 15, fontWeight: '600', marginTop: 8, lineHeight: 20 },
  videoViews: { fontSize: 12, marginTop: 3 },
  // Player
  playerContainer: { flex: 1 },
  playerBack: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 10 },
  playerBackText: { fontSize: 26 },
  playerVideo: { width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginTop: 50 },
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
  suggestedTitle: { fontSize: 17, fontWeight: 'bold', margin: 16 },
  suggestedGrid: { paddingHorizontal: 10 },
  suggestedCard: { width: CARD_W, margin: 6 },
  suggestedThumb: { width: '100%', height: 130, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  suggestedPlayIcon: { fontSize: 32 },
  suggestedVideoTitle: { fontSize: 14, fontWeight: '600', marginTop: 6, lineHeight: 19 },
  // Pages
  pageTitle: { fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 60 },
  subSub: { fontSize: 14, marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 16, marginTop: 24 },
  // Requests
  requestInput: { marginHorizontal: 16, padding: 12, borderRadius: 12, minHeight: 100, textAlignVertical: 'top', borderWidth: 1 },
  submitBtn: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  requestCard: {
    marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  requestText: { fontSize: 14, flex: 1 },
  requestStatus: { fontSize: 12 },
  // Subscription
  planCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 12, borderWidth: 1,
  },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '600' },
  planFeatures: { fontSize: 12, marginTop: 4 },
  planPrice: { fontSize: 18, fontWeight: 'bold' },
  // More
  moreSectionTitle: { fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  themeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  themeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  themeBtnIcon: { fontSize: 20, marginBottom: 4 },
  themeBtnText: { fontSize: 12, fontWeight: '600' },
  moreItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 12 },
  moreIcon: { fontSize: 20, marginRight: 12 },
  moreText: { fontSize: 16 },
  // Tab Bar
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 22, marginBottom: 4 },
  tabLabel: { fontSize: 11 },
  bottomPadding: { height: 100 },
});
