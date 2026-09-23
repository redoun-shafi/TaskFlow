import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export const storageService = {
  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    try {
      const ext = file.name.split('.').pop() || 'png';
      const cleanFileName = `avatar_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `profile_pictures/${userId}/${cleanFileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('Firebase Storage upload failed, converting to data URI fallback:', err);
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    return this.uploadProfilePicture(userId, file);
  },

  async uploadTaskAttachment(
    teamId: string,
    taskId: string,
    file: File
  ): Promise<{ name: string; url: string; size: number; type: string }> {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `task_attachments/${teamId}/${taskId}/${Date.now()}_${sanitizedName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return {
        name: file.name,
        url,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };
    } catch (err) {
      console.warn('Firebase Storage attachment failed, fallback to local data URI:', err);
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
      return {
        name: file.name,
        url,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };
    }
  },
};
