export const extractLastFrame = (videoUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    
    video.onloadedmetadata = () => {
      // Seek to almost the end (e.g., 0.1s before the end) to ensure we get a frame
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };

    video.onerror = (e) => {
      reject(new Error("Error loading video for frame extraction"));
    };
  });
};
