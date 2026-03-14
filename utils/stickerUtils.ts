export const createStaticSticker = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Clear background (transparent)
      ctx.clearRect(0, 0, 512, 512);

      // Calculate dimensions to fit within 512x512 while maintaining aspect ratio
      const scale = Math.min(512 / img.width, 512 / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      const x = (512 - width) / 2;
      const y = (512 - height) / 2;

      // Draw image
      ctx.drawImage(img, x, y, width, height);

      // Export as WebP
      const webpUrl = canvas.toDataURL('image/webp', 0.9);
      resolve(webpUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image for sticker'));
    img.src = imageUrl;
  });
};

export const downloadSticker = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
