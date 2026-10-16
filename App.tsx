import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const screenWidth = Dimensions.get('window').width;

// Snake segments arranged in a circle around Y
const SNAKE_SEGMENTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return {
    id: i,
    x: Math.cos(angle) * 60,
    y: Math.sin(angle) * 60,
  };
});

function SnakeLogo({ size = 160, color = '#2E7D32', bgColor = '#fff', spinning = true }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) return;
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinning]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: rotation }] }}>
        {SNAKE_SEGMENTS.map((seg, i) => (
          <View
            key={seg.id}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: color,
              left: seg.x - 5,
              top: seg.y - 5,
              opacity: 0.4 + (i / SNAKE_SEGMENTS.length) * 0.6,
            }}
          />
        ))}
      </Animated.View>
      <Text style={{ fontSize: size * 0.35, fontWeight: 'bold', color }}>Y</Text>
    </View>
  );
}

const videos = [
  { id: 1, title: 'فيديو 1', views: '546', duration: '15:30', isVertical: false, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { id: 2, title: 'فيديو 2', views: '8', duration: '12:45', isVertical: false, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  { id: 3, title: 'فيديو 3', views: '115', duration: '18:20', isVertical: false, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
  { id: 4, title: 'فيديو 4', views: '38', duration: '10:15', isVertical: true, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
  { id: 5, title: 'فيديو 5', views: '27', duration: '14:00', isVertical: true, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
  { id: 6, title: 'فيديو 6', views: '64', duration: '9:30', isVertical: true, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
];

const filterTabs = ['الكل', 'الأكثر مشاهدة', 'الأحدث'];

const files = [
  { id: 1, name: 'ملف 1', count: 546 },
  { id: 2, name: 'ملف 2', count: 8 },
  { id: 3, name: 'ملف 3', count: 115 },
  { id: 4, name: 'ملف 4', count: 38 },
  { id: 5, name: 'ملف 5', count: 27 },
  { id: 6, name: 'ملف 6', count: 64 },
];

const bottomTabs = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'requests', label: 'طلباتكم', icon: '📩' },
  { id: 'more', label: 'المزيد', icon: '☰' },
];

const myRequests = [
  { id: 1, text: 'طلب 1', status: 'قيد المراجعة', date: '2026-10-14' },
  { id: 2, text: 'طلب 2', status: 'تم النشر', date: '2026-10-10' },
  { id: 3, text: 'طلب 3', status: 'قيد التنفيذ', date: '2026-10-08' },
];

const topRequests = [
  { id: 1, text: 'طلب 1', count: 47 },
  { id: 2, text: 'طلب 2', count: 32 },
  { id: 3, text: 'طلب 3', count: 28 },
  { id: 4, text: 'طلب 4', count: 19 },
  { id: 5, text: 'طلب 5', count: 15 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState(0);

  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const videoRef = useRef<Video>(null);
  const [showMore, setShowMore] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'premium'>('light');
  const [splashVisible, setSplashVisible] = useState(true);
  const [videoBuffering, setVideoBuffering] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 30000);
    return () => clearTimeout(timer);
  }, []);

  const themes = {
    light: { bg: '#FAF6EF', text: '#3E322A', card: '#F7F2E9', accent: '#8B7DA6', banner: ['#9E8D7D', '#C8B8A6'], btn: '#8B7DA6', btnText: '#FFFFFF', sub: 'rgba(255,255,255,0.85)', title: '#FFFFFF' },
    dark: { bg: '#2A0848', text: '#FFD85E', card: '#240B45', accent: '#FF2F93', banner: ['#023B1A', '#14B866'], btn: '#661733', btnText: '#F9E7BA', sub: 'rgba(249,231,186,0.85)', title: '#FFD85E' },
    premium: { bg: '#1C1C1C', text: '#F5F5F0', card: '#2A2A2A', accent: '#C9A227', banner: ['#2D1B4E', '#1E1230'], btn: '#C9A227', btnText: '#1C1C1C', sub: 'rgba(245,245,240,0.75)', title: '#E8D48B' },
  };

  const t = themes[theme];

  const renderHome = () => {
    if (selectedVideo) return renderPlayer();

    if (selectedFile) {
      const fileVideos = videos.filter((v) => v.id <= selectedFile);
      return (
        <View style={[styles.screen, { backgroundColor: t.bg }]}>
          <View style={styles.fileHeader}>
            <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.backBtn}>
              <Text style={[styles.backBtnText, { color: t.accent }]}>→</Text>
            </TouchableOpacity>
            <Text style={[styles.pageTitle, { color: t.text }]}>ملف {selectedFile}</Text>
          </View>
          <FlatList
            data={fileVideos}
            numColumns={2}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.videosGrid}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.videoCard} onPress={() => setSelectedVideo(item.id)}>
                <View style={styles.videoThumb}>
                  <Text style={styles.videoPlayIcon}>▶️</Text>
                  <Text style={styles.videoDuration}>{item.duration}</Text>
                </View>
                <Text style={[styles.videoTitle, { color: t.text }]}>{item.title}</Text>
                <Text style={styles.videoViews}>{item.views} مشاهدة</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      );
    }

    return (
      <View style={[styles.screen, { backgroundColor: t.bg }]}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: t.card }]}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={[styles.profileName, { color: t.text }]}>المكتبة</Text>
        </View>

        {/* Subscription Banner */}
        <View style={[styles.banner, { backgroundColor: t.banner[0] }]}>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: t.title }]}>انضم لاشتراك المكتبة!</Text>
            <Text style={[styles.bannerSub, { color: t.sub }]}>بدون إعلانات • مشاهدة أسرع</Text>
          </View>
          <TouchableOpacity style={[styles.bannerBtn, { backgroundColor: t.btn[0] }]}>
            <Text style={[styles.bannerBtnText, { color: t.btnText }]}>ترقية</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={files}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.filesGrid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.fileCard} onPress={() => setSelectedFile(item.id)}>
              <View style={styles.fileThumb}>
                <Text style={styles.fileIcon}>📁</Text>
              </View>
              <Text style={[styles.fileName, { color: t.text }]}>{item.name}</Text>
              <Text style={styles.fileCount}>{item.count} فيديو</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderRequests = () => {
    const [requestText, setRequestText] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
      if (requestText.trim().length >= 3) {
        setSubmitted(true);
        setRequestText('');
        setTimeout(() => setSubmitted(false), 2000);
      }
    };

    return (
      <View style={styles.screen}>
        <Text style={styles.pageTitle}>طلباتكم</Text>
        
        <View style={styles.requestInputContainer}>
          <Text style={styles.requestPlaceholder}>اكتب الفيديو اللي عايزه...</Text>
          <TouchableOpacity
            style={[styles.submitBtn, requestText.trim().length < 3 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitBtnText}>إرسال</Text>
          </TouchableOpacity>
        </View>

        {submitted && (
          <View style={styles.successMsg}>
            <Text style={styles.successText}>✅ تم إرسال طلبك</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>طلباتي</Text>
        {myRequests.map((req) => (
          <View key={req.id} style={styles.requestCard}>
            <Text style={styles.requestText}>{req.text}</Text>
            <View style={styles.requestMeta}>
              <Text style={[styles.requestStatus, req.status === 'تم النشر' && styles.statusPublished]}>
                {req.status}
              </Text>
              <Text style={styles.requestDate}>{req.date}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>الأكثر طلباً</Text>
        {topRequests.map((req, index) => (
          <View key={req.id} style={styles.topRequestCard}>
            <Text style={styles.topRequestRank}>{index + 1}</Text>
            <Text style={styles.topRequestText}>{req.text}</Text>
            <Text style={styles.topRequestCount}>{req.count} طلب</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderFiles = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>الملفات</Text>
      <View style={styles.filesGrid}>
        {files.map((file) => (
          <TouchableOpacity key={file.id} style={styles.fileCard}>
            <View style={styles.fileThumb}>
              <Text style={styles.fileIcon}>📁</Text>
            </View>
            <Text style={styles.fileName}>{file.name}</Text>
            <Text style={styles.fileCount}>{file.count} فيديو</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const lastTap = useRef(0);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    if (selectedVideo) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock();
  }, [selectedVideo]);

  useEffect(() => {
    if (progress >= 100 && selectedVideo !== null) {
      const currentIndex = videos.findIndex((v) => v.id === selectedVideo);
      if (currentIndex < videos.length - 1) {
        setSelectedVideo(videos[currentIndex + 1].id);
        setProgress(0);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
        setProgress(100);
      }
    }
  }, [progress, selectedVideo, videos]);

  const handleScreenTap = (evt: any) => {
    const now = Date.now();
    const { locationX } = evt.nativeEvent;
    const screenWidth = 375;

    if (now - lastTap.current < 300) {
      // Double tap
      if (locationX > screenWidth / 2) {
        setProgress((p) => Math.min(100, p + 10));
        videoRef.current?.setPositionAsync((progress / 100) * 15000);
      } else {
        setProgress((p) => Math.max(0, p - 10));
        videoRef.current?.setPositionAsync((progress / 100) * 15000);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          setIsPlaying((p) => !p);
          lastTap.current = 0;
        }
      }, 300);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setVideoBuffering(status.isBuffering || false);
      const duration = status.durationMillis || 0;
      const position = status.positionMillis || 0;
      if (duration > 0) {
        setProgress(Math.round((position / duration) * 100));
      }
      if (status.didJustFinish) {
        const currentIndex = videos.findIndex((v) => v.id === selectedVideo);
        if (currentIndex < videos.length - 1) {
          setSelectedVideo(videos[currentIndex + 1].id);
          setProgress(0);
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
          setProgress(100);
        }
      }
    }
  };

  const renderPlayer = () => {
    const video = videos.find((v) => v.id === selectedVideo);
    if (!video) return null;

    return (
      <View style={[styles.screen, { backgroundColor: t.bg }]}>
        <TouchableOpacity onPress={() => setSelectedVideo(null)} style={styles.playerBackBtn}>
          <Text style={[styles.playerBackText, { color: t.accent }]}>→</Text>
        </TouchableOpacity>

        <View style={[styles.playerContainer, isLandscape && styles.playerContainerLandscape]}>
          {videoBuffering ? (
            <View style={[styles.playerScreen, video.isVertical && { height: 300 }, isLandscape && styles.playerScreenLandscape, { justifyContent: 'center', alignItems: 'center' }]}>
              <SnakeLogo size={120} color="#333" spinning={true} />
            </View>
          ) : (
            <Video
              ref={videoRef}
              source={{ uri: video.url }}
              style={[styles.playerScreen, video.isVertical && { height: 300 }, isLandscape && styles.playerScreenLandscape]}
              shouldPlay={isPlaying}
              isLooping={false}
              resizeMode={video.isVertical ? ResizeMode.CONTAIN : ResizeMode.COVER}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
          )}

          <View style={styles.playerControls}>
            <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)} style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProgress(Math.max(0, progress - 10))} style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>⏪</Text>
            </TouchableOpacity>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <TouchableOpacity onPress={() => setProgress(Math.min(100, progress + 10))} style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>⏩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsLandscape(!isLandscape)} style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>{isLandscape ? '📱' : '🔄'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.playerTitle}>{video.title}</Text>
          <Text style={styles.playerViews}>{video.views} مشاهدة</Text>
        </View>

        <Text style={styles.sectionTitle}>فيديوهات مقترحة</Text>
        <FlatList
          data={videos.filter((v) => v.id !== selectedVideo)}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.videosGrid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoCard} onPress={() => setSelectedVideo(item.id)}>
              <View style={styles.videoThumb}>
                <Text style={styles.videoPlayIcon}>▶️</Text>
                <Text style={styles.videoDuration}>{item.duration}</Text>
              </View>
              <Text style={styles.videoTitle}>{item.title}</Text>
              <Text style={styles.videoViews}>{item.views} مشاهدة</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderVideos = () => {
    if (selectedVideo) return renderPlayer();

    return (
      <View style={styles.screen}>
        <Text style={styles.pageTitle}>الفيديوهات</Text>
        <FlatList
          data={videos}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.videosGrid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoCard} onPress={() => setSelectedVideo(item.id)}>
              <View style={styles.videoThumb}>
                <Text style={styles.videoPlayIcon}>▶️</Text>
                <Text style={styles.videoDuration}>{item.duration}</Text>
              </View>
              <Text style={styles.videoTitle}>{item.title}</Text>
              <Text style={styles.videoViews}>{item.views} مشاهدة</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderMore = () => (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <Text style={[styles.pageTitle, { color: t.text }]}>المزيد</Text>

      <TouchableOpacity
        style={[styles.themeBtn, { backgroundColor: t.card }]}
        onPress={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'premium' : 'light')}
      >
        <Text style={[styles.themeBtnText, { color: t.text }]}>
          🎨 المظهر: {theme === 'light' ? 'فاتح' : theme === 'dark' ? 'داكن' : 'بريميوم'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.moreItem, { backgroundColor: t.card }]}>
        <Text style={[styles.moreItemText, { color: t.text }]}>👤 الحساب</Text>
      </View>
      <View style={[styles.moreItem, { backgroundColor: t.card }]}>
        <Text style={[styles.moreItemText, { color: t.text }]}>⚙️ الإعدادات</Text>
      </View>
      <View style={[styles.moreItem, { backgroundColor: t.card }]}>
        <Text style={[styles.moreItemText, { color: t.text }]}>ℹ️ عن التطبيق</Text>
      </View>
    </View>
  );

  const renderPlaceholder = (name: string) => (
    <View style={styles.screen}>
      <Text style={styles.placeholderText}>{name}</Text>
    </View>
  );

  if (splashVisible) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />
        <SnakeLogo size={160} color={t.accent} spinning={true} />
        <Text style={[styles.splashText, { color: t.text }]}>المكتبة</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />
      
      <View style={styles.content}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'files' && renderFiles()}
        {activeTab === 'videos' && renderVideos()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'tests' && renderPlaceholder('الاختبارات')}
        {activeTab === 'more' && renderMore()}
      </View>

      <View style={[styles.tabBar, { backgroundColor: t.bg, borderTopColor: t.card }]}>
        {bottomTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabIcon, activeTab === tab.id && { color: t.accent }]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, { color: t.text }, activeTab === tab.id && { color: t.accent }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  profileName: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 16,
    padding: 14,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerSub: {
    fontSize: 12,
    marginTop: 4,
  },
  bannerBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  bannerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  upgradeBtnText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  filterTab: {
    marginRight: 24,
    paddingVertical: 8,
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  filterTabText: {
    fontSize: 14,
    color: '#999',
  },
  filterTabTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  videosGrid: {
    paddingHorizontal: 12,
  },
  videoCard: {
    flex: 1,
    margin: 4,
    marginBottom: 16,
  },
  videoThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoPlayIcon: {
    fontSize: 24,
  },
  videoDuration: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    color: '#fff',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 6,
  },
  videoViews: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    margin: 16,
  },
  requestInputContainer: {
    marginHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  requestPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  submitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successMsg: {
    margin: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    alignItems: 'center',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    margin: 16,
    marginBottom: 8,
  },
  requestCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderRightWidth: 3,
    borderRightColor: '#4CAF50',
  },
  requestText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  requestStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  statusPublished: {
    color: '#4CAF50',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  topRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  topRequestRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    width: 24,
  },
  topRequestText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  topRequestCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 100,
  },
  themeBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  themeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  moreItem: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  moreItemText: {
    fontSize: 16,
  },
  filesGrid: {
    paddingHorizontal: 12,
  },
  fileCard: {
    flex: 1,
    margin: 4,
    marginBottom: 16,
    maxWidth: '50%',
  },
  fileThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 32,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  fileCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 20,
    color: '#4CAF50',
  },
  playerBackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playerBackText: {
    fontSize: 20,
    color: '#4CAF50',
  },
  playerContainer: {
    paddingHorizontal: 16,
  },
  playerContainerLandscape: {
    paddingHorizontal: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  playerScreenLandscape: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  playerScreen: {
    width: '100%',
    height: screenWidth * 0.5625,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playerPlayIcon: {
    fontSize: 48,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  controlBtn: {
    padding: 8,
  },
  controlBtnText: {
    fontSize: 20,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  playerViews: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#999',
  },
  tabLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
