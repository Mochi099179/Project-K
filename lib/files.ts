export type ReadImageResult = { file: File; base64: string; mediaType: string; dataUrl: string; name: string };

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function readImageFile(file: File): Promise<ReadImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
      if (!match) {
        reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        return;
      }
      resolve({ file, mediaType: match[1], base64: match[2], dataUrl, name: file.name });
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}
