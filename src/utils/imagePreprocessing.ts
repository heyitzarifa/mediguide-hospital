/**
 * imagePreprocessing.ts
 *
 * Canvas-based image preprocessing for OCR accuracy improvement.
 * Converts to grayscale + boosts contrast before passing to Tesseract.js.
 * Isolated here so it can be tuned or disabled independently.
 */

/**
 * Preprocesses an image File for better Tesseract.js OCR accuracy.
 *
 * Steps:
 *  1. Load the image into an HTMLImageElement
 *  2. Draw it to an off-screen canvas
 *  3. Convert each pixel to grayscale using luminosity formula
 *  4. Apply contrast boost (+-contrast factor around midpoint 128)
 *
 * @param file     The user-uploaded image file (JPG, PNG, WebP, etc.)
 * @param contrast Contrast multiplier. 1.8 is a good default; set to 1.0 to disable.
 * @returns        A PNG Blob suitable for Tesseract.recognize()
 */
export async function preprocessImageForOcr(
  file: File,
  contrast: number = 1.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Cap at 2400px on the longest side to keep WASM memory reasonable
      const MAX_SIDE = 2400;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Pixel-level grayscale + contrast pass
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Luminosity grayscale (perceived brightness)
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Contrast stretch around midpoint 128
        const contrasted = Math.min(
          255,
          Math.max(0, (gray - 128) * contrast + 128)
        );

        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
        // Alpha unchanged
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('canvas.toBlob() returned null'));
          }
        },
        'image/png'
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for preprocessing'));
    };

    img.src = objectUrl;
  });
}
