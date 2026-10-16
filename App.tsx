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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function App() {
  const [serverFiles, setServerFiles] = useState([]);
  const [serverVideos, setServerVideos] = useState([]);
  const [serverStatus, setServerStatus] = useState('loading');
  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const videoRef = useRef(null);
  const [showMore, setShowMore] = useState(false);
  const [theme, setTheme] = useState('light');
  const [splashVisible, setSplashVisible] = useState(true);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  async function fetchData() {
    try {
      const [fRes, vRes] = await Promise.all([
        fetch(`${API_URL}/api/files`),
        fetch(`${API_URL}/api/videos`),
      ]);
      const filesData = await fRes.json();
      const videosData = await vRes.json();
      setServerFiles(Array.isArray(filesData) ? filesData : []);
      setServerVideos(videosData?.data || videosData || []);
      setServerStatus('connected');
    } catch (e) {
      setServerStatus('offline');
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const themes = {
    light: { bg: '#FAF6EF', text: '#3E322A', card: '#F7F2E9', accent: '#8B7DA6', banner: ['#9E8D7D', '#C8B8A6'], btn: '#8B7DA6', btnText: '#FFFFFF', sub: 'rgba(255,255,255,0.85)', title: '#FFFFFF' },
    dark: { bg: '#2A0848', text: '#FFD85E', card: '#240B45', accent: '#FF2F93', banner: ['#023B1A', '#14B866'], btn: '#661733', btnText: '#F9E7BA', sub: 'rgba(249,231,186,0.85)', title: '#FFD85E' },
    premium: { bg: '#1C1C1C', text: '#F5F5F0', card: '#2A2A2A', accent: '#C9A227', banner: ['#2D1B4E', '#1E1230'], btn: '#C9A227', btnText: '#1C1C1C', sub: 'rgba(245,245,240,0.75)', title: '#E8D48B' },
  };

  const t = themes[theme];
  const displayVideos = serverVideos.length > 0 ? serverVideos : [];
  const displayFiles = serverFiles.length > 0 ? serverFiles : [];

  const handleSubmitRequest = async () => {
    if (requestText.trim().length >= 3) {
      try {
        await fetch(`${API_URL}/api/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: requestText.trim() }),
        });
        setRequestSubmitted(true);
        setRequestText('');
        setTimeout(() => setRequestSubmitted(false), 2000);
      } catch (e) {
        // silent fail
      }
    }
  };

  const renderHome = () => {
    if (selectedVideo) return renderPlayer();

    if (selectedFile) {
      const fileVideos = displayVideos.filter((v) => v.fileId === selectedFile);
      return (
        <View style={[styles.screen, { backgroundColor: t.bg }]}>
          <View style={styles.fileHeader}>
            <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.backBtn}>
              <Text style={[styles.backBtnText, { color: t.accent }]}>→</Text>
            </TouchableOpacity>
            <Text style={[styles.pageTitle, { color: t.text }]}>ملف {selectedFile}</Text>
          </View>
          {fileVideos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={{ color: t.text, marginTop: 8 }}>لا يوجد فيديوهات في هذا الملف</Text>
            </View>
          ) : (
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
          )}
        </View>
      );
    }

    return (
      <View style={[styles.screen, { backgroundColor: t.bg }]}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: t.card }]}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={[styles.profileName, { color: t.text }]}>المكتبة</Text>
        </View>

        <TouchableOpacity onPress={() => setActiveTab('subscription')} style={[styles.banner, { backgroundColor: t.banner[0] }]}>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: t.title }]}>انضم لاشتراك المكتبة!</Text>
            <Text style={[styles.bannerSub, { color: t.sub }]}>بدون إعلانات • مشاهدة أسرع</Text>
          </View>
          <View style={[styles.bannerBtn, { backgroundColor: t.btn }]}>
            <Text style={[styles.bannerBtnText, { color: t.btnText }]}>ترقية</Text>
          </View>
        </TouchableOpacity>

        {serverStatus === 'loading' && (
          <View style={styles.loadingState}>
            <Text>⏳</Text>
          </View>
        )}

        {serverStatus === 'offline' && (
          <View style={styles.offlineBanner}>
            <Text style={{ color: '#fff', fontSize: 13 }}>⚠️ غير متصل بالسيرفر — يتم عرض بيانات محلية</Text>
          </View>
        )}

        {displayFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>📂</Text>
            <Text style={{ color: t.text, marginTop: 8 }}>لا توجد ملفات بعد</Text>
          </View>
        ) : (
          <FlatList
            data={displayFiles}
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
        )}
      </View>
    );
  };

  const renderRequests = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>طلباتكم</Text>

      <View style={styles.requestInputContainer}>
        <TextInput
          style={styles.requestInput}
          placeholder="اكتب الفيديو اللي عايزه..."
          value={requestText}
          onChangeText={setRequestText}
          multiline
        />
        <TouchableOpacity
          style={[styles.submitBtn, requestText.trim().length < 3 && styles.submitBtnDisabled]}
          onPress={handleSubmitRequest}
        >
          <Text style={styles.submitBtnText}>إرسال</Text>
        </TouchableOpacity>
      </View>

      {requestSubmitted && (
        <View style={styles.successMsg}>
          <Text style={styles.successText}>✅ تم إرسال طلبك</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>طلباتي</Text>
      {[].map((req) => (
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
      {[].map((req, index) => (
        <View key={req.id} style={styles.topRequestCard}>
          <Text style={styles.topRequestRank}>{index + 1}</Text>
          <Text style={styles.topRequestText}>{req.text}</Text>
          <Text style={styles.topRequestCount}>{req.count} طلب</Text>
        </View>
      ))}
    </View>
  );

  const lastTap = useRef(0);
  const wakeLockRef = useRef(null);

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

  const handleScreenTap = (evt) => {
    const now = Date.now();
    const { locationX } = evt.nativeEvent;
    const screenWidth = 375;

    if (now - lastTap.current < 300) {
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

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setVideoBuffering(status.isBuffering || false);
      const duration = status.durationMillis || 0;
      const position = status.positionMillis || 0;
      if (duration > 0) {
        setProgress(Math.round((position / duration) * 100));
      }
      if (status.didJustFinish) {
        const currentIndex = displayVideos.findIndex((v) => v.id === selectedVideo);
        if (currentIndex < displayVideos.length - 1) {
          setSelectedVideo(displayVideos[currentIndex + 1].id);
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
    const video = displayVideos.find((v) => v.id === selectedVideo);
    if (!video) return null;

    return (
      <View style={[styles.screen, { backgroundColor: t.bg }]}>
        <TouchableOpacity onPress={() => setSelectedVideo(null)} style={styles.playerBackBtn}>
          <Text style={[styles.playerBackText, { color: t.accent }]}>→</Text>
        </TouchableOpacity>

        <View style={[styles.playerContainer, isLandscape && styles.playerContainerLandscape]}>
          {videoBuffering ? (
            <View style={[styles.playerScreen, video.isVertical && { height: 300 }, isLandscape && styles.playerScreenLandscape, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 48 }}>⏳</Text>
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
          data={displayVideos.filter((v) => v.id !== selectedVideo)}
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
        {displayVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🎬</Text>
            <Text style={{ color: t.text, marginTop: 8 }}>لا توجد فيديوهات بعد</Text>
          </View>
        ) : (
          <FlatList
            data={displayVideos}
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
        )}
      </View>
    );
  };

  const renderSubscription = () => (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <Text style={[styles.pageTitle, { color: t.text }]}>الاشتراك</Text>
      {[
        { name: 'شهري', price: '$1.99', features: 'كل المحتوى • بدون إعلانات' },
        { name: 'سنوي', price: '$14.99', features: 'نفس الشهري + شهرين مجاناً' },
        { name: 'مدى الحياة', price: '$29.99', features: 'دفعة واحدة للأبد' },
      ].map((plan, i) => (
        <View key={i} style={[styles.planCard, { backgroundColor: t.card }]}>
          <Text style={[styles.planName, { color: t.text }]}>{plan.name}</Text>
          <Text style={[styles.planPrice, { color: t.accent }]}>{plan.price}</Text>
          <Text style={[styles.planFeatures, { color: t.text }]}>{plan.features}</Text>
          <TouchableOpacity style={[styles.planBtn, { backgroundColor: t.btn }]}>
            <Text style={[styles.planBtnText, { color: t.btnText }]}>اشترك</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

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
      <TouchableOpacity style={[styles.moreItem, { backgroundColor: t.card }]} onPress={() => window.open('http://localhost:3000', '_blank')}>
        <Text style={[styles.moreItemText, { color: t.text }]}>⚙️ لوحة التحكم</Text>
      </TouchableOpacity>
    </View>
  );

  const bottomTabs = [
    { id: 'home', label: 'الرئيسية', icon: '🏠' },
    { id: 'requests', label: 'طلباتكم', icon: '📩' },
    { id: 'subscription', label: 'الاشتراك', icon: '⭐' },
    { id: 'more', label: 'المزيد', icon: '☰' },
  ];

  if (splashVisible) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />
        <Text style={{ fontSize: 80, fontWeight: 'bold', color: t.accent }}>Y</Text>
        <Text style={[styles.splashText, { color: t.text }]}>المكتبة</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />

      <View style={styles.content}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'videos' && renderVideos()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'subscription' && renderSubscription()}
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
  requestInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
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
  planCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  planFeatures: {
    fontSize: 13,
    marginTop: 8,
  },
  planBtn: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  planBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  tabLabel: {
    fontSize: 11,
    color: '#999',
  },
  loadingState: {
    padding: 20,
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: '#FF9800',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});

export default App;
