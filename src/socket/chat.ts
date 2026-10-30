export interface User {
  id: number;
  firstName: string;
  lastName: string;
  countryCode: string;
  contactNo: string;
  profileImage?: string;
  createdAt:string;
  updatedAt:string;
  status:string;
}
export interface Chat {
  id:number;
  friendId: number;
  friendName:string;
  files: string;
  friendFirstName:string;
  lastMessage: string;
  lastTimeStamp:string;
  unreadCount:number;
  profileImage:string;
  from: {
    id: number;
    firstName: string;
    lastName: string;
  };
  to?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  status: string;
  message:string;
}
export interface WSRequest {
  type: string;
  fromUserId?: number;
  toUserId?: number;
  message?: string;
}

export interface WSResponse {
  type: string;
  payload: any;
}

// Helper type for parsed media files
export interface MediaFileData {
  filePath: string;
  fileName: string;
  fileType: string;
  timestamp: number;
}

// Helper function to parse files from Chat message
export const parseMediaFiles = (filesJson: string): MediaFileData[] => {
  try {
    if (!filesJson || filesJson === "FILE:") {
      return [];
    }
    const parsed = JSON.parse(filesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse media files:", error);
    return [];
  }
};

// Helper function to create files JSON
export const createFilesJson = (files: MediaFileData[]): string => {
  if (files.length === 0) {
    return "FILE:";
  }
  return JSON.stringify(files);
};