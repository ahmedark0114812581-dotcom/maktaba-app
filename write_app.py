import os

app_code = """import { useState, useRef, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const COLORS = {
  bg: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceLight: '#2A2A4E',
  accent: '#FF2F93',
  accent2: '#00D4FF',
  gold: '#FFD700',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2D1B4E',
};

const folders = [
  { id: 1, name: 'مقاطع جديدة', count: 546, color: '#FF2F93' },
  { id: 2, name: 'تعليمي', count: 8, color: '#00D4FF' },
  { id: 3, name: 'ترفيهي', count: 115, color: '#FFD700' },
  { id: 4, name: 'رياضي', count: 38, color: '#00FF88' },
  { id: 5, name: 'موسيقى', count: 64, color: '#FF6B35' },
  { id: 6, name: 'تقنية', count: 4, color: '#9B59B6' },
];

const sampleVideos = [
  { id: 1, title: 'مقدمة في البرمجة', duration: '15:30', views: '546', folderId: 1, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { id: 2, title: 'أساسيات التصميم', duration: '12:45', views: '115', folderId: 1, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  { id: 3, title: 'تعلم الربح من الإنترنت', duration: '18:20', views: '89', folderId: 2, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
  { id: 4, title: 'أفضل تطبيقات 2025', duration: '10:15', views: '67', folderId: 3, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
  { id: 5, title: 'مراجعة هاتف جديد', duration: '14:00', views: '45', folderId: 4, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
  { id: 6, title: 'سرعة الإنجاز', duration: '9:30', views: '34', folderId: 5, url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMembership, setShowMembership] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowMembership(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const renderHome = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مقاطع</Text>
      </View>
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>👤</Text>
        </View>
        <Text style={styles.profileName}>مقاطع جديدة 2025 🔥</Text>
      </View>
      <TouchableOpacity style={styles.membershipBanner} onPress={() => setShowMembership(true)}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>JOIN OUR MEMBERSHIP!</Text>
          <Text style={styles.bannerSub}>AD-Free • Play Acceleration</Text>
        </View>
        <View style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>Upgrade</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.tabs}>
        {['الكل', 'رائج', 'حديث'].map((tab, i) => (
          <TouchableOpacity key={tab} style={[styles.tab, i === 0 && styles.tabActive]}>
            <Text style={[styles.tabText, i === 0 && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.grid}>
        {folders.map((folder) => (
          <TouchableOpacity key={folder.id} style={[styles.folderCard, { borderColor: folder.color }]} onPress={() => { setSelectedFolder(folder); setActiveTab('folder'); }}>
            <View style={[styles.folderIcon, { backgroundColor: folder.color + '20' }]}>
              <Text style={[styles.folderIconText, { color: folder.color }]}>📁</Text>
            </View>
            <Text style={styles.folderName}>{folder.name}</Text>
            <Text style={styles.folderCount}>{folder.count} فيديو</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderFolder = () => {
    const folderVideos = sampleVideos.filter(v => v.folderId === selectedFolder?.id);
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.folderHeader}>
          <TouchableOpacity onPress={() => setActiveTab('home')}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.folderHeaderTitle}>{selectedFolder?.name}</Text>
        </View>
        <View style={styles.videoGrid}>
          {folderVideos.map((video) => (
            <TouchableOpacity key={video.id} style={styles.videoCard} onPress={() => { setSelectedVideo(video); setActiveTab('player'); }}>
              <View style={styles.videoThumb}>
                <Text style={styles.videoPlayIcon}>▶</Text>
                <Text style={styles.videoDuration}>{video.duration}</Text>
              </View>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.videoViews}>{video.views} مشاهدة</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };

  const renderPlayer = () => {
    if (!selectedVideo) return null;
    return (
      <View style={styles.playerContainer}>
        <TouchableOpacity style={styles.playerBack} onPress={() => { setActiveTab('folder'); setSelectedVideo(null); }}>
          <Text style={styles.playerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.playerVideo}>
          <Video ref={videoRef} source={{ uri: selectedVideo.url }} style={styles.video} shouldPlay={isPlaying} isLooping={false} resizeMode={ResizeMode.CONTAIN} onPlaybackStatusUpdate={(status) => { if (status.isLoaded && status.durationMillis) { setProgress((status.positionMillis / status.durationMillis) * 100); } }} />
          <TouchableOpacity style={styles.playBtn} onPress={() => setIsPlaying(!isPlaying)}>
            <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerTitle}>{selectedVideo.title}</Text>
          <Text style={styles.playerViews}>{selectedVideo.views} مشاهدة</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.suggestedTitle}>فيديوهات مقترحة</Text>
        <FlatList data={sampleVideos.filter(v => v.id !== selectedVideo.id).slice(0, 4)} numColumns={2} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.suggestedGrid} renderItem={({ item }) => (
          <TouchableOpacity style={styles.suggestedCard} onPress={() => setSelectedVideo(item)}>
            <View style={styles.suggestedThumb}>
              <Text style={styles.suggestedPlayIcon}>▶</Text>
            </View>
            <Text style={styles.suggestedVideoTitle}>{item.title}</Text>
          </TouchableOpacity>
        )} />
      </View>
    );
  };

  const renderRequests = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>طلباتكم</Text>
      <TextInput style={styles.requestInput} placeholder="اكتب الفيديو اللي عايزه..." placeholderTextColor={COLORS.textSecondary} multiline />
      <TouchableOpacity style={styles.submitBtn}><Text style={styles.submitBtnText}>إرسال</Text></TouchableOpacity>
      <Text style={styles.sectionTitle}>طلباتي</Text>
      {['شرح المعادلات من الصفر', 'الجدول الدوري مبسط', 'قوانين نيوتن'].map((req, i) => (
        <View key={i} style={styles.requestCard}>
          <Text style={styles.requestText}>{req}</Text>
          <Text style={[styles.requestStatus, i === 0 && { color: COLORS.gold }]}>{i === 0 ? 'قيد المراجعة' : i === 1 ? 'تم النشر' : 'قيد التنفيذ'}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderMore = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>المزيد</Text>
      {['👤 الحساب', '⚙️ الإعدادات', 'ℹ️ عن التطبيق'].map((item, i) => (
        <TouchableOpacity key={i} style={styles.moreItem}>
          <Text style={styles.moreIcon}>{item.split(' ')[0]}</Text>
          <Text style={styles.moreText}>{item.split(' ')[1]}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {activeTab === 'home' && renderHome()}
      {activeTab === 'folder' && selectedFolder && renderFolder()}
      {activeTab === 'player' && selectedVideo && renderPlayer()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'more' && renderMore()}
      {activeTab !== 'player' && (
        <View style={styles.tabBar}>
          {[{ id: 'home', icon: '🏠', label: 'الرئيسية' }, { id: 'requests', icon: '📩', label: 'طلباتكم' }, { id: 'more', icon: '☰', label: 'المزيد' }].map((tab) => (
            <TouchableOpacity key={tab.id} style={styles.tabItem} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabIcon, activeTab === tab.id && { color: COLORS.accent }]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.id && { color: COLORS.accent }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Modal visible={showMembership} transparent animationType="slide" onRequestClose={() => setShowMembership(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>العضوية المميزة</Text>
            <Text style={styles.modalSub}>بدون إعلانات • مشاهدة أسرع</Text>
            {[{ name: 'شهري', price: '$1.99' }, { name: 'سنوي', price: '$14.99' }, { name: 'مدى الحياة', price: '$29.99' }].map((plan, i) => (
              <TouchableOpacity key={i} style={styles.planCard}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowMembership(false)}>
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  profileSection: { alignItems: 'center', paddingVertical: 20 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.accent },
  profileAvatarText: { fontSize: 36 },
  profileName: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 10 },
  membershipBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 10, padding: 16, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.gold },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.gold },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  bannerBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bannerBtnText: { color: COLORS.text, fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginVertical: 10 },
  tab: { marginRight: 24, paddingVertical: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { fontSize: 14, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.text, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  folderCard: { width: (screenWidth - 36) / 2, margin: 6, padding: 16, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  folderIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 8 },
  folderIconText: { fontSize: 24 },
  folderName: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  folderCount: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  folderHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { fontSize: 24, color: COLORS.accent, marginRight: 12 },
  folderHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  videoCard: { width: (screenWidth - 36) / 2, margin: 6 },
  videoThumb: { width: '100%', height: 100, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  videoPlayIcon: { fontSize: 24, color: COLORS.accent },
  videoDuration: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', color: COLORS.text, fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  videoTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 6 },
  videoViews: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  playerContainer: { flex: 1, backgroundColor: COLORS.bg },
  playerBack: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 10 },
  playerBackText: { fontSize: 24, color: COLORS.accent },
  playerVideo: { width: '100%', height: screenHeight * 0.4, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%' },
  playBtn: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  playBtnText: { fontSize: 24, color: COLORS.text },
  playerInfo: { padding: 16 },
  playerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  playerViews: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  progressBar: { height: 4, backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
  suggestedTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, margin: 16 },
  suggestedGrid: { paddingHorizontal: 12 },
  suggestedCard: { width: (screenWidth - 36) / 2, margin: 6 },
  suggestedThumb: { width: '100%', height: 80, borderRadius: 8, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  suggestedPlayIcon: { fontSize: 20, color: COLORS.accent },
  suggestedVideoTitle: { fontSize: 12, color: COLORS.text, marginTop: 4 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, margin: 16, marginTop: 60 },
  requestInput: { marginHorizontal: 16, padding: 12, borderRadius: 12, backgroundColor: COLORS.surface, color: COLORS.text, minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center' },
  submitBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, margin: 16, marginTop: 24 },
  requestCard: { marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 12, backgroundColor: COLORS.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestText: { fontSize: 14, color: COLORS.text, flex: 1 },
  requestStatus: { fontSize: 12, color: COLORS.accent2 },
  moreItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 12, backgroundColor: COLORS.surface },
  moreIcon: { fontSize: 20, marginRight: 12 },
  moreText: { fontSize: 16, color: COLORS.text },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 20, marginBottom: 4 },
  tabLabel: { fontSize: 11, color: COLORS.textSecondary },
  bottomPadding: { height: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  planCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: COLORS.surfaceLight, marginBottom: 12 },
  planName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  planPrice: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
  modalClose: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: COLORS.surfaceLight, alignItems: 'center' },
  modalCloseText: { color: COLORS.text, fontWeight: '600' },
});
"""

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_code)
print(f'Written {len(app_code)} chars to App.tsx')
