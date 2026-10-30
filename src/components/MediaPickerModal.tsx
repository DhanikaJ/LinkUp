import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import MediaUploadService from "../util/mediaUploadService";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onFilesSelected: (files: MediaFile[], uploadedPaths: string[]) => void;
  userId: number;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  visible,
  onClose,
  onFilesSelected,
  userId,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status: photoStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    return photoStatus === "granted" && cameraStatus === "granted";
  };

  const pickImages = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Camera and photo library permissions are required");
      return;
    }

    try {
      // ✅ BACKWARD COMPATIBLE: Works with both old and new API
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || "Images" as any,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const files: MediaFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize || 0,
        }));

        setSelectedFiles((prev) => [...prev, ...files]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: "Failed to pick images",
      });
    }
  };

  const pickVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Camera and photo library permissions are required");
      return;
    }

    try {
      // ✅ BACKWARD COMPATIBLE
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Videos || "Videos" as any,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file: MediaFile = {
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          type: asset.mimeType || "video/mp4",
          size: asset.fileSize || 0,
        };

        setSelectedFiles((prev) => [...prev, file]);
      }
    } catch (error) {
      console.error("Video picker error:", error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: "Failed to pick video",
      });
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Camera permissions are required");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file: MediaFile = {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize || 0,
        };

        setSelectedFiles((prev) => [...prev, file]);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: "Failed to take photo",
      });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", 
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file: MediaFile = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
        };

        setSelectedFiles((prev) => [...prev, file]);
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: "Failed to pick document",
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      Toast.show({
        type: ALERT_TYPE.WARNING,
        title: "No Files",
        textBody: "Please select at least one file",
      });
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = selectedFiles.map((file) =>
        MediaUploadService.uploadMedia(file.uri, file.name, file.type, userId)
      );

      const results = await Promise.all(uploadPromises);

      const failedUploads = results.filter((r) => !r.success);
      if (failedUploads.length > 0) {
        Toast.show({
          type: ALERT_TYPE.WARNING,
          title: "Partial Upload",
          textBody: `${failedUploads.length} file(s) failed to upload`,
        });
      }

      const uploadedPaths = results
        .filter((r) => r.success && r.filePath)
        .map((r) => r.filePath!);

      if (uploadedPaths.length > 0) {
        onFilesSelected(selectedFiles, uploadedPaths);
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: "Success",
          textBody: `${uploadedPaths.length} file(s) uploaded`,
        });
        setSelectedFiles([]);
        onClose();
      } else {
        Toast.show({
          type: ALERT_TYPE.DANGER,
          title: "Upload Failed",
          textBody: "All files failed to upload",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: "Error",
        textBody: "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  const renderFilePreview = ({ item, index }: { item: MediaFile; index: number }) => {
    const isImage = item.type.startsWith("image/");
    const isVideo = item.type.startsWith("video/");
    const isDocument = item.type.includes("pdf") || item.type.includes("document");

    return (
      <View style={styles.filePreviewContainer}>
        {isImage ? (
          <Image source={{ uri: item.uri }} style={styles.previewImage} />
        ) : isVideo ? (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={32} color="#fff" />
          </View>
        ) : isDocument ? (
          <View style={styles.docPlaceholder}>
            <Ionicons name="document" size={32} color="#fff" />
          </View>
        ) : (
          <View style={styles.filePlaceholder}>
            <Ionicons name="attach" size={32} color="#fff" />
          </View>
        )}

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFile(index)}
        >
          <Ionicons name="close-circle" size={24} color="#ef4444" />
        </TouchableOpacity>

        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileSize}>
          {MediaUploadService.formatFileSize(item.size)}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Media</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Action Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionButtons}
        >
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Ionicons name="camera" size={32} color="#ef4444" />
            <Text style={styles.actionLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickImages}>
            <Ionicons name="images" size={32} color="#3b82f6" />
            <Text style={styles.actionLabel}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickVideo}>
            <Ionicons name="videocam" size={32} color="#f59e0b" />
            <Text style={styles.actionLabel}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickDocument}>
            <Ionicons name="document" size={32} color="#10b981" />
            <Text style={styles.actionLabel}>Files</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* File Preview Grid */}
        {selectedFiles.length > 0 ? (
          <FlatList
            data={selectedFiles}
            renderItem={renderFilePreview}
            keyExtractor={(_, index) => index.toString()}
            numColumns={2}
            style={styles.fileGrid}
            contentContainerStyle={styles.gridContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-upload-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No files selected</Text>
            <Text style={styles.emptySubtext}>
              Tap above to add photos, videos, or documents
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.fileCount}>
            {selectedFiles.length} file(s) selected
          </Text>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (uploading || selectedFiles.length === 0) && styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload & Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  actionButton: {
    alignItems: "center",
    marginRight: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },
  fileGrid: {
    flex: 1,
  },
  gridContent: {
    padding: 8,
  },
  filePreviewContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  previewImage: {
    width: "100%",
    height: 150,
  },
  videoPlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  docPlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  filePlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  fileName: {
    padding: 8,
    fontSize: 12,
    color: "#1f2937",
    backgroundColor: "#fff",
  },
  fileSize: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    fontSize: 10,
    color: "#6b7280",
    backgroundColor: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  fileCount: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  uploadButton: {
    flexDirection: "row",
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});