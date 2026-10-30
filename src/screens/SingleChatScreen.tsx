import {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStack } from "../../App";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLayoutEffect, useState, useRef, useEffect, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSingleChat } from "../socket/UseSingleChat";
import { Chat } from "../socket/chat";
import { formatChatTime } from "../util/DateFormatter";
import { useSendChat } from "../socket/UseSendChat";
import { ModernChatBubble } from "../components/ModernChatBubble";
import { MediaPickerModal } from "../components/MediaPickerModal";
import { MediaGalleryView } from "../components/MediaGalleryView";
import MediaUploadService from "../util/mediaUploadService";
import { useWebSocket } from "../socket/WebSocketProvider";
import { AuthContext } from "../components/AuthProvider";

type SingleChatScreenProps = NativeStackScreenProps<
  RootStack,
  "SingleChatScreen"
>;

interface ReplyTo {
  message: Chat;
}

interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export default function SingleChatScreen({
  route,
  navigation,
}: SingleChatScreenProps) {
  const { chatId, friendName, lastSeenTime, profileImage } = route.params;
  const singleChat = useSingleChat(chatId);
  const messages = singleChat.messages;
  const friend = singleChat.friend;
  const sendMessage = useSendChat();
  const authContext = useContext(AuthContext);
  const userId = authContext?.userId;
  const { sendMessage: wsSendMessage } = useWebSocket();
  
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
  navigation.setOptions({
    title: "",
    headerLeft: () => (
      <View className="items-center flex-row gap-x-2">
        <TouchableOpacity
          className="justify-center items-center"
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back-sharp" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity className="h-14 w-14 rounded-full border border-gray-300 justify-center items-center">
          <Image
            source={{ uri: profileImage }}
            className="h-14 w-14 rounded-full"
          />
        </TouchableOpacity>
        <View className="space-y-1">
          <Text className="font-bold text-lg">
            {friend ? friend.firstName + " " + friend.lastName : friendName}
          </Text>
          <Text className="italic text-xs font-semibold text-gray-500">
            {isTyping ? (
              <Text className="text-blue-500">Typing...</Text>
            ) : friend?.status === "ONLINE" ? (
              <Text className="text-green-500">● Online</Text>
            ) : (
              `Last seen ${formatChatTime(friend?.updatedAt ?? "")}`
            )}
          </Text>
        </View>
      </View>
    ),
    headerRight: () => (
      <View className="flex-row items-center gap-3">
        <TouchableOpacity className="p-2">
          <Ionicons name="ellipsis-vertical" size={24} color="black" />
        </TouchableOpacity>
      </View>
    ),
  });
}, [navigation, friend, isTyping]);

  useEffect(() => {
    if (replyTo) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [replyTo, fadeAnim]);

  const handleTextChange = (text: string) => {
    setInput(text);

    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const handleMediaSelected = async (files: MediaFile[], uploadedPaths: string[]) => {
    if (uploadedPaths.length === 0) return;

    // Create files JSON for storage
    const filesData = uploadedPaths.map((path, idx) => ({
      filePath: path,
      fileName: files[idx]?.name || "media",
      fileType: files[idx]?.type || "application/octet-stream",
      timestamp: Date.now(),
    }));

    const filesJson = JSON.stringify(filesData);

    // Send message with files
    if (userId) {
      wsSendMessage({
        type: "send_message",
        toUserId: chatId,
        message: "[Media Shared]",
        files: filesJson,
      });
    }
  };

  const renderItem = ({ item }: { item: Chat }) => {
    const isMe = item.from.id !== chatId;

    // Parse files from message
    let mediaFiles = [];
    const filesField = (item as any).files;
    if (filesField && filesField !== "FILE:") {
      try {
        mediaFiles = JSON.parse(filesField);
      } catch (e) {
        console.warn("Failed to parse files:", e);
      }
    }

    return (
      <View>
        <ModernChatBubble
          item={item}
          isMe={isMe}
          chatId={chatId}
          onReply={(msg) => setReplyTo({ message: msg })}
        />
        {mediaFiles.length > 0 && (
          <MediaGalleryView files={mediaFiles} isMe={isMe} />
        )}
      </View>
    );
  };

  const handleSendChat = () => {
    if (!input.trim()) {
      return;
    }
    sendMessage(chatId, input);
    setInput("");
    setReplyTo(null);
    setIsTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["right", "bottom", "left"]}
    >
      <StatusBar hidden={false} barStyle="dark-content" />
      <KeyboardAvoidingView
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 50}
        behavior={Platform.OS === "android" ? "padding" : "height"}
      >
        {/* Messages List */}
        <FlatList
          data={messages}
          renderItem={renderItem}
          className="px-2 flex-1"
          inverted
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center">
              <Ionicons name="chatbubble-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-400 text-center mt-4">
                No messages yet. Say hello!
              </Text>
            </View>
          }
        />

        {/* Reply Preview */}
        {replyTo && (
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 mx-3 rounded"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-xs font-bold text-blue-600 mb-1">
                  Replying to {replyTo.message.from.firstName}
                </Text>
                <Text className="text-sm text-gray-700 line-clamp-2">
                  {replyTo.message.message}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)} className="p-1">
                <Ionicons name="close" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Input Area */}
        <View className="flex-row items-end p-3 bg-white border-t border-gray-200">
          {/* Media Button */}
          <TouchableOpacity
            className="bg-blue-500 w-10 h-10 items-center justify-center rounded-full mr-2"
            onPress={() => setMediaPickerVisible(true)}
          >
            <Ionicons name="attach" size={24} color="white" />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            value={input}
            onChangeText={handleTextChange}
            multiline
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            className="flex-1 min-h-10 max-h-28 h-auto px-4 py-2 bg-gray-100 rounded-full text-base text-gray-800"
          />

          {/* Send Button */}
          <TouchableOpacity
            className={`${
              input.trim() ? "bg-green-500" : "bg-gray-300"
            } w-10 h-10 items-center justify-center rounded-full ml-2`}
            onPress={handleSendChat}
            disabled={!input.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={input.trim() ? "white" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Media Picker Modal */}
      <MediaPickerModal
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onFilesSelected={handleMediaSelected}
        userId={parseInt(userId || "0")}
      />
    </SafeAreaView>
  );
}