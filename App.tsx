import { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// ============ APP ============
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedFolder, setSelectedFolder] = useState<typeof folders[0] | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<typeof sampleVideos[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [theme, setTheme] = useState('light');
  const [isLandscape, setIsLandscape] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [requests, setRequests] = useState([
    { id: 1, text: 'شرح المعادلات من الصفر', status: 'قيد المراجعة' },
    { id: 2, text: 'الجدول الدوري مبسط', status: 'تم النشر' },
    { id: 3, text: 'قوانين نيوتن', status: 'قيد التنفيذ' },
  ]);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const t = themes[theme as keyof typeof themes];

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
  const renderPlayer = () => {
    if (!selectedVideo) return null;
    const isVertical = selectedVideo.isVertical;
    const playerHeight = isVertical ? 300 : screenWidth * 0.5625;

    const handlePlaybackStatusUpdate = (status: any) => {
      if (status.isLoaded && status.durationMillis != null && status.durationMillis > 0) {
        setProgress((status.positionMillis / status.durationMillis) * 100);
        if (status.didJustFinish) {
          const currentIndex = sampleVideos.findIndex(v => v.id === selectedVideo.id);
          if (currentIndex < sampleVideos.length - 1) {
            setSelectedVideo(sampleVideos[currentIndex + 1]);
            setProgress(0);
          }
        }
      }
    };

    const skipForward = async () => {
      if (videoRef.current) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.min(status.positionMillis + 10000, status.durationMillis ?? status.positionMillis + 10000);
          await videoRef.current.setPositionAsync(newPosition);
        }
      }
    };

    const skipBackward = async () => {
      if (videoRef.current) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.max(status.positionMillis - 10000, 0);
          await videoRef.current.setPositionAsync(newPosition);
        }
      }
    };

    return (
      <View style={[styles.playerContainer, { backgroundColor: t.bg }]}>
        <TouchableOpacity style={styles.playerBack} onPress={() => { setSelectedVideo(null); setActiveTab('folder'); }}>
          <Text style={[styles.playerBackText, { color: t.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={[styles.playerVideo, { height: playerHeight }]}>
          <Video
            ref={videoRef}
            source={{ uri: selectedVideo.url }}
            style={styles.video}
            shouldPlay={isPlaying}
            isLooping={false}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
          <TouchableOpacity style={styles.playBtn} onPress={() => setIsPlaying(!isPlaying)}>
            <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.playerControls}>
          <TouchableOpacity onPress={skipBackward} style={styles.controlBtn}>
            <Text style={[styles.controlBtnText, { color: t.text }]}>⏪</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.controlBtn}>
            <Text style={[styles.controlBtnText, { color: t.text }]}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={skipForward} style={styles.controlBtn}>
            <Text style={[styles.controlBtnText, { color: t.text }]}>⏩</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLandscape(!isLandscape)} style={styles.controlBtn}>
            <Text style={[styles.controlBtnText, { color: t.text }]}>{isLandscape ? '📱' : '🔄'}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.progressBar, { backgroundColor: t.card }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: t.accent }]} />
        </View>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerTitle, { color: t.text }]}>{selectedVideo.title}</Text>
          <Text style={[styles.playerViews, { color: t.textSecondary }]}>{selectedVideo.views} مشاهدة</Text>
        </View>
        <Text style={[styles.suggestedTitle, { color: t.text }]}>فيديوهات مقترحة</Text>
        <FlatList
          data={sampleVideos.filter(v => v.id !== selectedVideo.id).slice(0, 4)}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.suggestedGrid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestedCard} onPress={() => { setSelectedVideo(item); setProgress(0); }}>
              <View style={[styles.suggestedThumb, { backgroundColor: t.card }]}>
                <Text style={[styles.suggestedPlayIcon, { color: t.accent }]}>{item.isVertical ? '📱' : '▶'}</Text>
              </View>
              <Text style={[styles.suggestedVideoTitle, { color: t.text }]}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // ============ FOLDER ============
  const renderFolder = () => {
    if (!selectedFolder) return null;
    const folderVideos = sampleVideos.filter(v => v.folderId === selectedFolder.id);
    return (
      <ScrollView style={[styles.container, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.folderHeader}>
          <TouchableOpacity onPress={() => { setSelectedFolder(null); setActiveTab('home'); }}>
            <Text style={[styles.backBtn, { color: t.accent }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.folderHeaderTitle, { color: t.text }]}>{selectedFolder.name}</Text>
        </View>
        <View style={styles.videoGrid}>
          {folderVideos.map((video) => (
            <TouchableOpacity key={video.id} style={styles.videoCard} onPress={() => { setSelectedVideo(video); setActiveTab('player'); }}>
              <View style={[styles.videoThumb, { backgroundColor: t.card }]}>
                <Text style={[styles.videoPlayIcon, { color: t.accent }]}>{video.isVertical ? '📱' : '▶'}</Text>
                <Text style={styles.videoDuration}>{video.duration}</Text>
              </View>
              <Text style={[styles.videoTitle, { color: t.text }]}>{video.title}</Text>
              <Text style={[styles.videoViews, { color: t.textSecondary }]}>{video.views} مشاهدة</Text>
            </TouchableOpacity>
          ))}
        </View>
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
      <TouchableOpacity style={[styles.membershipBanner, { backgroundColor: t.card }]} onPress={() => setActiveTab('subscription')}>
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
          <TouchableOpacity key={folder.id} style={[styles.folderCard, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => { setSelectedFolder(folder); setActiveTab('folder'); }}>
            <View style={[styles.folderIcon, { backgroundColor: folder.color + '20' }]}>
              <Text style={[styles.folderIconText, { color: folder.color }]}>📁</Text>
            </View>
            <Text style={[styles.folderName, { color: t.text }]}>{folder.name}</Text>
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
      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: t.accent }]} onPress={() => {
        if (requestText.trim().length >= 3) {
          setRequests([{ id: Date.now(), text: requestText.trim(), status: 'قيد المراجعة' }, ...requests]);
          setRequestText('');
        }
      }}>
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
          <View>
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
        {[
          { id: 'light', name: 'فاتح', icon: '☀️' },
          { id: 'dark', name: 'داكن', icon: '🌙' },
          { id: 'premium', name: 'بريميوم', icon: '⭐' },
        ].map((th) => (
          <TouchableOpacity
            key={th.id}
            style={[styles.themeBtn, { backgroundColor: theme === th.id ? t.accent : t.card, borderColor: t.border }]}
            onPress={() => setTheme(th.id)}
          >
            <Text style={styles.themeBtnIcon}>{th.icon}</Text>
            <Text style={[styles.themeBtnText, { color: theme === th.id ? '#FFF' : t.text }]}>{th.name}</Text>
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
      {activeTab === 'player' && selectedVideo && renderPlayer()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'subscription' && renderSubscription()}
      {activeTab === 'more' && renderMore()}

      {activeTab !== 'player' && (
        <View style={[styles.tabBar, { backgroundColor: t.tabBar, borderTopColor: t.border }]}>
          {[
            { id: 'home', icon: '🏠', label: 'الرئيسية' },
            { id: 'requests', icon: '📩', label: 'طلباتكم' },
            { id: 'subscription', icon: '⭐', label: 'الاشتراك' },
            { id: 'more', icon: '☰', label: 'المزيد' },
          ].map((tab) => (
            <TouchableOpacity key={tab.id} style={styles.tabItem} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabIcon, activeTab === tab.id && { color: t.accent }]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, { color: activeTab === tab.id ? t.accent : t.textSecondary }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

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
  membershipBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 10, padding: 16, borderRadius: 16 },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: 'bold' },
  bannerSub: { fontSize: 12, marginTop: 4 },
  bannerBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bannerBtnText: { color: '#FFF', fontWeight: '600' },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  folderCard: { width: (screenWidth - 36) / 2, margin: 6, padding: 16, borderRadius: 12, borderWidth: 1 },
  folderIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 8 },
  folderIconText: { fontSize: 24 },
  folderName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  folderCount: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  // Folder
  folderHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { fontSize: 24, marginRight: 12 },
  folderHeaderTitle: { fontSize: 20, fontWeight: 'bold' },
  // Videos
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  videoCard: { width: (screenWidth - 36) / 2, margin: 6 },
  videoThumb: { width: '100%', height: 100, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  videoPlayIcon: { fontSize: 24 },
  videoDuration: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFF', fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  videoTitle: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  videoViews: { fontSize: 11, marginTop: 2 },
  // Player
  playerContainer: { flex: 1 },
  playerBack: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 10 },
  playerBackText: { fontSize: 24 },
  playerVideo: { width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  video: { width: '100%', height: '100%' },
  playBtn: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  playBtnText: { fontSize: 24, color: '#FFF' },
  playerControls: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  controlBtn: { padding: 8 },
  controlBtnText: { fontSize: 24 },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  playerInfo: { padding: 16 },
  playerTitle: { fontSize: 18, fontWeight: 'bold' },
  playerViews: { fontSize: 14, marginTop: 4 },
  suggestedTitle: { fontSize: 16, fontWeight: 'bold', margin: 16 },
  suggestedGrid: { paddingHorizontal: 12 },
  suggestedCard: { width: (screenWidth - 36) / 2, margin: 6 },
  suggestedThumb: { width: '100%', height: 80, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  suggestedPlayIcon: { fontSize: 20 },
  suggestedVideoTitle: { fontSize: 12, marginTop: 4 },
  // Pages
  pageTitle: { fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 60 },
  subSub: { fontSize: 14, marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 16, marginTop: 24 },
  // Requests
  requestInput: { marginHorizontal: 16, padding: 12, borderRadius: 12, minHeight: 100, textAlignVertical: 'top', borderWidth: 1 },
  submitBtn: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  requestCard: { marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestText: { fontSize: 14, flex: 1 },
  requestStatus: { fontSize: 12 },
  // Subscription
  planCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 12, borderWidth: 1 },
  planName: { fontSize: 16, fontWeight: '600' },
  planFeatures: { fontSize: 12, marginTop: 4 },
  planPrice: { fontSize: 18, fontWeight: 'bold' },
  // More
  moreSectionTitle: { fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
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
  tabIcon: { fontSize: 20, marginBottom: 4 },
  tabLabel: { fontSize: 11 },
  bottomPadding: { height: 100 },
});
