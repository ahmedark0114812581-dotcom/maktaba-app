import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = 'maktaba2026';

export default function App() {
  const [activeTab, setActiveTab] = useState('الرئيسية');
  const [files, setFiles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [fRes, vRes] = await Promise.all([
        fetch(`${API_URL}/api/files`),
        fetch(`${API_URL}/api/videos`),
      ]);
      const filesData = await fRes.json();
      const videosData = await vRes.json();
      setFiles(Array.isArray(filesData) ? filesData : []);
      setVideos(videosData?.data || videosData || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  }

  const renderHome = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>لوحة التحكم</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statNumber}>{files.length}</Text>
          <Text style={styles.statLabel}>ملفات</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.statNumber}>{videos.reduce((sum, v) => sum + (v.views || 0), 0)}</Text>
          <Text style={styles.statLabel}>مشاهدة</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.statNumber}>{videos.length}</Text>
          <Text style={styles.statLabel}>فيديو</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>آخر الفيديوهات</Text>
      {videos.slice(0, 5).map((video) => (
        <View key={video.id} style={styles.videoRow}>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>{video.title}</Text>
            <Text style={styles.videoMeta}>{video.views || 0} مشاهدة • {video.duration || '0:00'}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderVideos = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>الفيديوهات</Text>
      {videos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>🎬</Text>
          <Text style={{ color: '#999', marginTop: 8 }}>لا توجد فيديوهات بعد</Text>
        </View>
      ) : (
        videos.map((video) => (
          <View key={video.id} style={styles.videoRow}>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.videoMeta}>{video.views || 0} مشاهدة • {video.duration || '0:00'}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert('حذف', `هل تريد حذف "${video.title}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: async () => {
                      await fetch(`${API_URL}/api/videos/${video.id}`, {
                        method: 'DELETE',
                        headers: { 'x-admin-token': ADMIN_TOKEN },
                      });
                      fetchData();
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.deleteBtnText}>حذف</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderFiles = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>الملفات</Text>
      {files.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>📁</Text>
          <Text style={{ color: '#999', marginTop: 8 }}>لا توجد ملفات بعد</Text>
        </View>
      ) : (
        files.map((file) => (
          <View key={file.id} style={styles.fileRow}>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{file.name}</Text>
              <Text style={styles.fileCount}>{file.count} فيديو</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert('حذف', `هل تريد حذف "${file.name}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: async () => {
                      await fetch(`${API_URL}/api/files/${file.id}`, {
                        method: 'DELETE',
                        headers: { 'x-admin-token': ADMIN_TOKEN },
                      });
                      fetchData();
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.deleteBtnText}>حذف</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const tabs = ['الرئيسية', 'الفيديوهات', 'الملفات'];

  if (loading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text>⏳ جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.content}>
        {activeTab === 'الرئيسية' && renderHome()}
        {activeTab === 'الفيديوهات' && renderVideos()}
        {activeTab === 'الملفات' && renderFiles()}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    margin: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    margin: 16,
    marginBottom: 8,
  },
  videoRow: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  videoMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  fileRow: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fileCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#c62828',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  },
  tabLabel: {
    fontSize: 12,
    color: '#999',
  },
  tabLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
