import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Text,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MediaItem {
  filePath: string;
  fileName: string;
  fileType: string;
  timestamp?: number;
}

interface MediaGalleryViewProps {
  files: MediaItem[];
  isMe: boolean;
}

const { width, height } = Dimensions.get("window");

export const MediaGalleryView: React.FC<MediaGalleryViewProps> = ({
  files,
  isMe,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean[]>(
    Array(files.length).fill(true)
  );

  if (!files || files.length === 0) {
    return null;
  }

  const getMediaUrl = (filePath: string) => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    return `${baseUrl}/${filePath}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.startsWith("video/")) return "videocam";
    if (fileType.includes("pdf")) return "document-text";
    if (fileType.includes("word") || fileType.includes("document"))
      return "document";
    return "attach";
  };

  const handleImageLoad = (index: number) => {
    setImageLoading((prev) => {
      const newState = [...prev];
      newState[index] = false;
      return newState;
    });
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    const isImage = item.fileType.startsWith("image/");
    const isVideo = item.fileType.startsWith("video/");
    const isDocument =
      item.fileType.includes("pdf") ||
      item.fileType.includes("document") ||
      item.fileType.includes("word");
    const mediaUrl = getMediaUrl(item.filePath);

    if (isImage) {
      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.mediaItem,
            { alignSelf: isMe ? "flex-end" : "flex-start" },
          ]}
          onPress={() => setExpandedIndex(index)}
        >
          <View style={styles.imageContainer}>
            {imageLoading[index] && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <Image
              source={{ uri: mediaUrl }}
              style={styles.image}
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageLoad(index)}
            />
          </View>
        </TouchableOpacity>
      );
    }

    if (isVideo) {
      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.mediaItem,
            { alignSelf: isMe ? "flex-end" : "flex-start" },
          ]}
        >
          <View style={styles.videoContainer}>
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam" size={40} color="#fff" />
            </View>
            <View style={styles.videoOverlay}>
              <Ionicons name="play-circle" size={48} color="#fff" />
            </View>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.fileName}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (isDocument) {
      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.mediaItem,
            { alignSelf: isMe ? "flex-end" : "flex-start" },
          ]}
        >
          <View style={styles.documentContainer}>
            <View style={styles.documentIcon}>
              <Ionicons
                name={getFileIcon(item.fileType)}
                size={32}
                color="#fff"
              />
            </View>
            <Text style={styles.documentName} numberOfLines={2}>
              {item.fileName}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={{ marginVertical: 8 }}>
      {/* Media Grid */}
      <View style={styles.mediaGrid}>
        {files.map((item, index) => renderMediaItem(item, index))}
      </View>

      {/* Expanded Image Modal */}
      {expandedIndex !== null && files[expandedIndex]?.fileType.startsWith("image/") && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setExpandedIndex(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setExpandedIndex(null)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {files[expandedIndex]?.fileName}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
            >
              <Image
                source={{ uri: getMediaUrl(files[expandedIndex].filePath) }}
                style={styles.expandedImage}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.imageInfo}>
                {files[expandedIndex]?.fileName}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 8,
  },
  mediaItem: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 200,
    height: 150,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 10,
  },
  videoContainer: {
    width: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  videoPlaceholder: {
    width: 200,
    height: 150,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  fileName: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: "#1f2937",
    backgroundColor: "#fff",
  },
  documentContainer: {
    width: 160,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  documentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  documentName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    flex: 1,
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: height - 140,
  },
  expandedImage: {
    width: width,
    height: height - 140,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  imageInfo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});