import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { API_ROOT, fetchOptions } from "../config/api";

interface MediaFile {
  uri: string;
  type: string;
  name: string;
  size: number;
}

interface UploadResponse {
  success: boolean;
  message: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  timestamp?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSION_QUALITY = 0.7;

class MediaUploadService {
  /**
   * Compress image for faster upload and storage
   */
  static async compressImage(uri: string): Promise<string> {
    try {
      console.log("Compressing image from:", uri);
      
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280, height: 1920 } }],
        { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      console.log("Compressed image to:", manipResult.uri);
      
      if (!manipResult.uri || manipResult.uri.length === 0) {
        console.warn("Image compression returned empty URI, using original");
        return uri;
      }
      
      return manipResult.uri;
    } catch (error) {
      console.warn("Image compression failed, using original:", error);
      return uri;
    }
  }

  /**
   * Convert file to base64 using new File API
   * Note: We don't use this in uploads (FormData is better)
   * Keeping for reference/future use
   */
  static async fileToBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    
    // Access the base64 property (it's a getter)
    const base64String = file.base64;
    
    // Check if it's actually a string
    if (typeof base64String !== 'string' || !base64String) {
      throw new Error("Failed to read file content - base64 is empty or invalid");
    }
    
    return base64String;
  } catch (error) {
    console.error("Error converting file to base64:", error);
    throw new Error("Failed to convert file to base64: " + error);
  }
}
  /**
   * Get file size in bytes using new File API
   */
  static async getFileSize(uri: string): Promise<number> {
    try {
      const file = new File(uri);
      const size = file.size; // Property getter
      
      if (typeof size === 'number' && size > 0) {
        return size;
      }
      
      console.warn("File size is 0 or undefined, file may not exist");
      return 0;
    } catch (error) {
      console.error("Error getting file size:", error);
      return 0;
    }
  }

  /**
   * Check if file exists using new File API
   */
  static async fileExists(uri: string): Promise<boolean> {
    try {
      const file = new File(uri);
      const exists = file.exists; // Property getter
      return exists === true;
    } catch (error) {
      console.error("Error checking file existence:", error);
      return false;
    }
  }

  /**
   * Validate file before upload
   */
  static async validateFile(
    uri: string,
    fileType: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if file exists
      const exists = await this.fileExists(uri);
      if (!exists) {
        return { valid: false, error: "File does not exist" };
      }

      // Get file size
      const size = await this.getFileSize(uri);

      if (size === 0) {
        return { valid: false, error: "File is empty" };
      }

      if (size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File size exceeds 5MB limit (${(size / 1024 / 1024).toFixed(2)}MB)`,
        };
      }

      // Validate file type
      const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg"];
      const allowedMediaTypes = [
        ...allowedImageTypes,
        "audio/mpeg",
        "audio/mp3",
        "video/mp4",
        "video/quicktime",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedMediaTypes.includes(fileType)) {
        return { valid: false, error: `File type ${fileType} is not supported` };
      }

      return { valid: true };
    } catch (error) {
      console.error("File validation error:", error);
      return { valid: false, error: "Validation failed" };
    }
  }

  /**
   * Upload media file to backend using FormData (React Native compatible)
   */
  static async uploadMedia(
    uri: string,
    fileName: string,
    fileType: string,
    userId: number
  ): Promise<UploadResponse> {
    try {
      // Validate file first
      const validation = await this.validateFile(uri, fileType);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || "File validation failed",
        };
      }

      // Compress image if it's an image file
      let fileUri = uri;
      if (fileType.startsWith("image/")) {
        console.log("Compressing image...");
        fileUri = await this.compressImage(uri);
      }

      // Create FormData
      console.log("Preparing upload...");
      const formData = new FormData();
      formData.append("userId", userId.toString());
      
      // React Native FormData format
      formData.append("media", {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);

      console.log("Uploading to:", `${API_ROOT}/PulseChat/MediaUploadController`);
      console.log("File:", fileName, fileType);

      // Upload to server using fetch (works better than React Native)
      const response = await fetch(
        `${API_ROOT}/PulseChat/MediaUploadController`,
        {
          method: "POST",
          body: formData,
          ...fetchOptions(),
        }
      );

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Upload successful:", data);
        return data;
      } else {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        return {
          success: false,
          message: `Upload failed: ${response.status} - ${errorText}`,
        };
      }
    } catch (error: any) {
      console.error("Media upload error:", error);
      
      if (error.message?.includes("Network request failed")) {
        return {
          success: false,
          message: "Network error - check your connection and server URL",
        };
      }

      return {
        success: false,
        message: error.message || "Upload failed",
      };
    }
  }

  /**
   * Upload multiple media files
   */
  static async uploadMultipleMedia(
    files: MediaFile[],
    userId: number
  ): Promise<UploadResponse[]> {
    const uploads = files.map((file) =>
      this.uploadMedia(file.uri, file.name, file.type, userId)
    );
    return Promise.all(uploads);
  }

  /**
   * Parse files JSON from chat message
   */
  static parseFilesFromMessage(filesJson: string): any[] {
    try {
      if (!filesJson || filesJson === "FILE:" || filesJson.trim() === "") {
        return [];
      }

      const parsed = JSON.parse(filesJson);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      console.warn("Failed to parse files JSON:", error);
      return [];
    }
  }

  /**
   * Create files JSON for storage
   */
  static createFilesJson(files: UploadResponse[]): string {
    const fileData = files
      .filter((f) => f.success && f.filePath)
      .map((f) => ({
        filePath: f.filePath,
        fileName: f.fileName,
        fileType: f.fileType,
        timestamp: f.timestamp,
      }));

    return fileData.length > 0 ? JSON.stringify(fileData) : "FILE:";
  }

  /**
   * Get file extension from URI
   */
  static getFileExtension(uri: string): string {
    const match = uri.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : "";
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      mp4: "video/mp4",
      mov: "video/quicktime",
      mp3: "audio/mpeg",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
}

export default MediaUploadService;