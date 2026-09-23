// 100% Free In-Browser File & Avatar Storage (No Firebase Storage billing required!)

export const storageService = {
  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // Compress/resize image if large
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    return this.uploadProfilePicture(userId, file);
  },

  async uploadTaskAttachment(
    teamId: string,
    taskId: string,
    file: File
  ): Promise<{ name: string; url: string; size: number; type: string }> {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    return {
      name: file.name,
      url,
      size: file.size,
      type: file.type || 'application/octet-stream',
    };
  },
};
