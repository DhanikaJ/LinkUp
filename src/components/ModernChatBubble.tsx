import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Chat } from "../socket/chat";
import { formatChatTime } from "../util/DateFormatter";
import { ALERT_TYPE, Toast } from "react-native-alert-notification";

interface ModernChatBubbleProps {
  item: Chat;
  isMe: boolean;
  chatId: number;
  onReply?: (message: Chat) => void;
}

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
const { width } = Dimensions.get("window");

export const ModernChatBubble: React.FC<ModernChatBubbleProps> = ({
  item,
  isMe,
  chatId,
  onReply,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<{ [key: string]: number }>({});
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  // Animate reaction menu entrance
  const animateReactionMenu = () => {
    setShowReactions(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleReaction = (emoji: string) => {
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
    setShowReactions(false);
    scaleAnim.setValue(0);
  };

  const handleCopy = async () => {
    try {
      await Share.share({
        message: item.message,
      });
    } catch (error) {
      console.log("Copy error:", error);
    }
    setShowMenu(false);
  };

  const handleReplyAction = () => {
    onReply?.(item);
    setShowMenu(false);
  };

  const menuOptions = [
    { icon: "copy", label: "Copy", onPress: handleCopy },
    { icon: "arrow-redo", label: "Reply", onPress: handleReplyAction },
    { icon: "heart", label: "React", onPress: animateReactionMenu },
    ...(isMe ? [{ icon: "trash", label: "Delete", onPress: () => {} }] : []),
  ];

  const getBubbleStyle = () => {
    if (isMe) {
      return {
        alignSelf: "flex-end" as const,
        backgroundColor: "#059669",
        borderTopRightRadius: 4,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      };
    } else {
      return {
        alignSelf: "flex-start" as const,
        backgroundColor: "#1f2937",
        borderTopRightRadius: 16,
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      };
    }
  };

  return (
    <View style={{ marginVertical: 4, marginHorizontal: 12 }}>
      {/* Message Bubble */}
      <TouchableOpacity
        onLongPress={() => setShowMenu(true)}
        activeOpacity={0.7}
        style={[
          styles.bubble,
          getBubbleStyle(),
          { maxWidth: width * 0.75 },
        ]}
      >
        <Text style={styles.messageText}>{item.message}</Text>

        {/* Footer: Time + Status */}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {formatChatTime(item.createdAt)}
          </Text>
          {isMe && (
            <Ionicons
              name={
                item.status === "READ"
                  ? "checkmark-done-sharp"
                  : item.status === "DELIVERED"
                    ? "checkmark-done-sharp"
                    : "checkmark"
              }
              size={16}
              color={item.status === "READ" ? "#0284c7" : "#d1d5db"}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Reaction Bar */}
      {Object.keys(reactions).length > 0 && (
        <View style={[styles.reactionBar, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
          {Object.entries(reactions).map(([emoji, count]) => (
            <View key={emoji} style={styles.reactionBubble}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 1 && (
                <Text style={styles.reactionCount}>{count}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Context Menu Modal */}
      <Modal
        transparent
        visible={showMenu}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={[
              styles.menuContainer,
              {
                left: isMe ? width - 180 : 10,
              },
            ]}
          >
            {menuOptions.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.menuItem}
                onPress={option.onPress}
              >
                <Ionicons name={option.icon as any} size={20} color="#0284c7" />
                <Text style={styles.menuLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reaction Selection Modal */}
      <Modal
        transparent
        visible={showReactions}
        animationType="fade"
        onRequestClose={() => setShowReactions(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            setShowReactions(false);
            scaleAnim.setValue(0);
          }}
        >
          <Animated.View
            style={[
              styles.reactionSelector,
              {
                left: isMe ? width - 220 : 20,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionOption}
                onPress={() => handleReaction(emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  timestamp: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontStyle: "italic",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
  },
  menuContainer: {
    position: "absolute",
    top: "50%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  reactionBar: {
    flexDirection: "row",
    marginTop: 4,
    marginHorizontal: 8,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  reactionSelector: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 24,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  reactionOption: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
});