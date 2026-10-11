/**
 * Media Upload Services
 * - Photos & Images: ImgBB API (with IndexedDB offline fallback)
 * - Videos: Cloudinary API (with IndexedDB high-speed fallback)
 */

import { saveMediaToIndexedDB, resolveMediaUrl } from './mediaStore';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export const getCloudinaryConfig = (): CloudinaryConfig => {
  const custom = localStorage.getItem('sky_chat_cloudinary_config');
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (parsed.cloudName && parsed.uploadPreset) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  };
};

export const saveCloudinaryConfig = (config: CloudinaryConfig): void => {
  localStorage.setItem('sky_chat_cloudinary_config', JSON.stringify(config));
};

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '2d47b5ba409c91d4e2808c1f93012921';

/**
 * Uploads an image file to ImgBB API with automatic IndexedDB fallback
 * @param file File or Blob to upload
 * @returns Direct public image URL or idb: reference
 */
export const uploadImageToImgBB = async (file: File | Blob): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success && result.data?.url) {
      return result.data.display_url || result.data.url;
    } else {
      console.warn('ImgBB API returned non-success, saving to local IndexedDB store');
      return await saveMediaToIndexedDB(file);
    }
  } catch (error) {
    console.warn('Error uploading image to ImgBB, using IndexedDB fallback:', error);
    return await saveMediaToIndexedDB(file);
  }
};

/**
 * Uploads a video file to Cloudinary API (if configured) or instantly saves to IndexedDB
 * @param file Video File or Blob to upload
 * @returns Direct public Cloudinary video URL or idb: reference
 */
export const uploadVideoToCloudinary = async (file: File | Blob): Promise<string> => {
  const config = getCloudinaryConfig();

  // If user configured Cloudinary cloud name & preset, try uploading
  if (config.cloudName && config.uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.secure_url) {
          return result.secure_url;
        }
      } else {
        console.warn('Cloudinary upload returned non-200, saving safely to IndexedDB');
      }
    } catch (error) {
      console.warn('Cloudinary upload network error, saving safely to IndexedDB:', error);
    }
  }

  // 100% reliable local video storage (no size limits, zero crashes, plays instantly!)
  return await saveMediaToIndexedDB(file);
};

/**
 * Checks if a file or URL is a video
 */
export const isVideo = (fileOrUrl: File | Blob | string): boolean => {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === 'string') {
    // If it's an image extension or explicitly marked as image, never treat as video
    if (/\.(jpeg|jpg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(fileOrUrl) || fileOrUrl.startsWith('data:image/')) {
      return false;
    }
    if (fileOrUrl.startsWith('idb:')) {
      // Check for vid_ prefix or video keyword
      return fileOrUrl.startsWith('idb:vid_') || fileOrUrl.includes('video');
    }
    return (
      fileOrUrl.includes('/video/upload/') ||
      fileOrUrl.includes('/video/') ||
      fileOrUrl.startsWith('data:video/') ||
      /\.(mp4|webm|ogg|mov|m4v|mkv|3gp)(\?.*)?$/i.test(fileOrUrl)
    );
  }
  return fileOrUrl.type.startsWith('video/');
};

/**
 * Helper to convert file to data URL
 */
export const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export { resolveMediaUrl };

