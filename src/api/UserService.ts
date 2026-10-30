import { useContext } from "react";
import { UserRegistrationData } from "../components/UserContext";
import { API_ROOT, fetchOptions } from "../config/api";

export const createNewAccount = async (
  userRegistrationData: UserRegistrationData
) => {
  let formData = new FormData();
  formData.append("firstName", userRegistrationData.firstName);
  formData.append("lastName", userRegistrationData.lastName);
  formData.append("countryCode", userRegistrationData.countryCode);
  formData.append("contactNo", userRegistrationData.contactNo);
  formData.append("profileImage", {
    uri: userRegistrationData.profileImage,
    name: "profile.png",
    type: "image/png",
  } as any);

  const response = await fetch(API_ROOT + "/UserController", {
    method: "POST",
    body: formData,
    ...fetchOptions(),
  });

  if (response.ok) {
    const json = await response.json();
    return json;
  } else {
    return "OOPS! Account creation failed!";
  }
};

export const uploadProfileImage = async (userId: string, imageUri: string) => {
  let formData = new FormData();
  formData.append("userId", userId);
  formData.append("profileImage", {
    uri: imageUri,
    type: "image/png", // change if PNG
    name: "profile.png",
  } as any);

  const response = await fetch(API_ROOT + "/ProfileController", {
    method: "POST",
    body: formData,
    ...fetchOptions(),
  });
  if (response.ok) {
    return await response.json();
  } else {
    console.warn("Profile image uploading failed!");
  }
};

export const uploadStatusImage = async (userId: string, imageUri: string) => {
  let formData = new FormData();
  formData.append("userId", userId);
  formData.append("statusImage", {
    uri: imageUri,
    type: "image/png",
    name: `status_${Date.now()}.png`,
  } as any);

  try {
    const response = await fetch(API_ROOT + "/MediaController", {
      method: "POST",
      body: formData,
      ...fetchOptions(),
    });

    if (response.ok) {
      const json = await response.json();
      return json;
    } else {
      const errorText = await response.text();
      console.warn("Status image uploading failed:", errorText);
      return { success: false, message: "Upload failed" };
    }
  } catch (error) {
    console.error("Status image upload error:", error);
    return { success: false, message: "Network error" };
  }
};
