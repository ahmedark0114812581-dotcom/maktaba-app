import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';

const categories = [
  { id: 1, name: 'ملف 1', count: 546 },
  { id: 2, name: 'ملف 2', count: 8 },
  { id: 3, name: 'ملف 3', count: 115 },
  { id: 4, name: 'ملف 4', count: 38 },
  { id: 5, name: 'ملف 5', count: 27 },
  { id: 6, name: 'ملف 6', count: 64 },
];

const videos = [
  { id: 1, title: 'فيديو 1', views: '546', duration: '15:30' },
  { id: 2, title: 'فيديو 2', views: '8', duration: '12:45' },
  { id: 3, title: 'فيديو 3', views: '115', duration: '18:20' },
  { id: 4, title: 'فيديو 4', views: '38', duration: '10:15' },
  { id: 5, title: 'فيديو 5', views: '27', duration: '14:00' },
  { id: 6, title: 'فيديو 6', views: '64', duration: '9:30' },
];

const tabs = ['الرئيسية', 'الفيديوهات', 'الطلبات', 'التحليلات'];

export default function App() {
  const [activeTab, setActiveTab] = useState('الرئيسية');

  const renderHome = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>لوحة التحكم</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statNumber}>6</Text>
          <Text style={styles.statLabel}>ملفات</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.statNumber}>798</Text>
          <Text style={styles.statLabel}>مشاهدة</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.statNumber}>131</Text>
          <Text style={styles.statLabel}>طلب</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>آخر الطلبات</Text>
      {['شرح المعادلات من الصفر', 'الجدول الدوري مبسط', 'قوانين نيوتن'].map((req, i) => (
        <View key={i} style={styles.requestCard}>
          <Text style={styles.requestText}>{req}</Text>
          <Text style={[styles.requestStatus, i === 0 && { color: '#FF9800' }]}>
            {i === 0 ? 'قيد المراجعة' : i === 1 ? 'تم النشر' : 'قيد التنفيذ'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderVideos = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>الفيديوهات</Text>
      {videos.map((video) => (
        <View key={video.id} style={styles.videoRow}>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>{video.title}</Text>
            <Text style={styles.videoMeta}>{video.views} مشاهدة • {video.duration}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>حذف</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderRequests = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>الطلبات</Text>
      {['شرح المعادلات من الصفر', 'الجدول الدوري مبسط', 'قوانين نيوتن', 'الخلية النباتية', 'الحروب العالمية'].map((req, i) => (
        <View key={i} style={styles.requestCard}>
          <Text style={styles.requestText}>{req}</Text>
          <Text style={styles.requestCount}>{(47 - i * 7)} طلب</Text>
        </View>
      ))}
    </View>
  );

  const renderAnalytics = () => (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>التحليلات</Text>
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>أعلى مشاهدة</Text>
        <Text style={styles.analyticsValue}>فيديو 1 — 546</Text>
      </View>
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>أكثر طلب</Text>
        <Text style={styles.analyticsValue}>شرح المعادلات — 47</Text>
      </View>
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>متوسط وقت المشاهدة</Text>
        <Text style={styles.analyticsValue}>12:30</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.content}>
        {activeTab === 'الرئيسية' && renderHome()}
        {activeTab === 'الفيديوهات' && renderVideos()}
        {activeTab === 'الطلبات' && renderRequests()}
        {activeTab === 'التحليلات' && renderAnalytics()}
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
  requestCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  requestStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  requestCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
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
  analyticsCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  analyticsTitle: {
    fontSize: 14,
    color: '#666',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
