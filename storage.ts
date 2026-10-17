/**
 * نظام التحميلات — تخزين الفيديوهات في مجلد التطبيق الخاص (مش المعرض)
 * بيشتغل على الهاتف (Android/iOS). على الويب التحميل غير متاح.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ============ معرّف الجهاز ============
let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const file = FileSystem.documentDirectory + 'device.id';
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(file);
      if (content && content.trim()) {
        cachedDeviceId = content.trim();
        return cachedDeviceId;
      }
    }
    const id = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await FileSystem.writeAsStringAsync(file, id);
    cachedDeviceId = id;
    return id;
  } catch (e) {
    cachedDeviceId = 'dev-fallback-' + Date.now();
    return cachedDeviceId;
  }
}

// ============ مجلد التحميلات ============
export function getDownloadsDir(): string {
  return FileSystem.documentDirectory + 'downloads/';
}

export async function ensureDownloadsDir(): Promise<string> {
  const dir = getDownloadsDir();
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch (e) { /* موجود غالباً */ }
  return dir;
}

export function localVideoPath(videoId: number | string): string {
  return getDownloadsDir() + 'v_' + videoId + '.mp4';
}

// ============ التحقق من فيديو محلي ============
export async function getLocalVideoUri(videoId: number | string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const p = localVideoPath(videoId);
    const info = await FileSystem.getInfoAsync(p);
    return info.exists ? p : null;
  } catch (e) {
    return null;
  }
}

// ============ تحميل فيديو ============
export function resolveUrl(u: string): string {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}

export async function downloadVideo(
  video: { id: number | string; url: string },
  onProgress?: (p: number) => void
): Promise<string> {
  await ensureDownloadsDir();
  const dest = localVideoPath(video.id);
  const resumable = FileSystem.createDownloadResumable(
    resolveUrl(video.url),
    dest,
    {},
    (p) => {
      const total = p.totalBytesExpectedToWrite || 1;
      const prog = Math.min(p.totalBytesWritten / total, 1);
      if (onProgress) onProgress(prog);
    }
  );
  const result = await resumable.downloadAsync();
  if (!result || !result.uri) throw new Error('فشل التحميل');
  return result.uri;
}

// ============ حذف فيديو محلي ============
export async function deleteLocalVideo(videoId: number | string): Promise<void> {
  try {
    const p = localVideoPath(videoId);
    const info = await FileSystem.getInfoAsync(p);
    if (info.exists) await FileSystem.deleteAsync(p);
  } catch (e) { /* موجودش */ }
}

// ============ قائمة التحميلات (من السيرفر) ============
export async function getDownloadsList(): Promise<any[]> {
  try {
    const did = await getDeviceId();
    const r = await fetch(`${API_URL}/api/downloads?deviceId=${encodeURIComponent(did)}`);
    const j = await r.json();
    return j.data || [];
  } catch (e) {
    return [];
  }
}

// ============ الاشتراك ============
export async function isSubscribed(): Promise<boolean> {
  try {
    const did = await getDeviceId();
    const r = await fetch(`${API_URL}/api/subscription?deviceId=${encodeURIComponent(did)}`);
    const j = await r.json();
    return !!j.subscribed;
  } catch (e) {
    return false;
  }
}

export async function activateCode(code: string): Promise<{ valid: boolean; plan?: string; reason?: string }> {
  try {
    const did = await getDeviceId();
    const r = await fetch(`${API_URL}/api/codes/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId: did }),
    });
    return await r.json();
  } catch (e) {
    return { valid: false, reason: 'مشكلة في الاتصال' };
  }
}

// تسجيل تحميل جديد على السيرفر
export async function registerDownload(videoId: number | string, title: string, size: number): Promise<void> {
  try {
    const did = await getDeviceId();
    await fetch(`${API_URL}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: did, videoId, title, size }),
    });
  } catch (e) { /* مش حاجة حرجة */ }
}

export async function removeDownload(id: number): Promise<void> {
  try {
    const did = await getDeviceId();
    await fetch(`${API_URL}/api/download/${id}?deviceId=${encodeURIComponent(did)}`, { method: 'DELETE' });
  } catch (e) { /* مش حاجة حرجة */ }
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

// ============ قفل البصمة ============
export async function isLockEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const file = FileSystem.documentDirectory + 'lock.enabled';
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) return false;
    const content = await FileSystem.readAsStringAsync(file);
    return content.trim() === '1';
  } catch (e) {
    return false;
  }
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'lock.enabled', enabled ? '1' : '0');
  } catch (e) { /* تجاهل */ }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const LocalAuthentication = require('expo-local-authentication');
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'بصمة المكتبة',
      fallbackLabel: 'استخدم رمز الدخول',
      disableDeviceFallback: false,
    });
    return !!res.success;
  } catch (e) {
    return false;
  }
}
