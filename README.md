# LinkUp (Mobile App)

**LinkUp** is a real-time chat app for mobile. This repository is the **frontend**: an Expo (React Native) app written in TypeScript and styled with NativeWind. It connects to a separate Java backend, [LinkUp-Backend](https://github.com/DhanikaJ/LinkUp-Backend), over HTTP (account and file uploads) and a WebSocket (live chat).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> **Status:** academic prototype. One-to-one text chat, contacts and profile photos work against a backend you run yourself. Sign-in on an existing account, the Status tab and the Calls tab are not built yet (see [Known Limitations](#known-limitations)).

## Repositories

LinkUp is a cross-origin application split into two repositories:

| Repository | Role | Technology |
|---|---|---|
| **LinkUp** (this repo) | Mobile client | Expo, React Native, TypeScript, NativeWind |
| [**LinkUp-Backend**](https://github.com/DhanikaJ/LinkUp-Backend) | Chat server, file uploads, database access | Java servlets, WebSocket, Hibernate, MySQL, GlassFish |

The app and the server run on different origins (a phone and a computer, or a tunnel), so all addresses are configured through environment variables.

## Features

- **Sign-up in three steps:** name, country code and phone number, then a profile photo. Input is validated (country code like `+94`, phone number of 7 to 15 digits, photo required), and the user is signed in as soon as the account is created.
- **Real-time one-to-one chat** over a WebSocket, with sent/read ticks, last-seen information and an automatic reconnect with a keep-alive ping
- **Chat list** with the last message, its time and an unread count
- **Contacts:** pick someone from your contacts to start a chat, or add a new contact by name, country code and phone number
- **Attachments:** pick images, videos, audio or documents and view them in a media gallery inside the chat
- **Reply, copy and reaction menu** on messages (see the limitations: reactions and replies are not sent to the server yet)
- **Profile screen** where you can change your profile photo
- **Light, dark and system themes**, saved on the device
- **Splash screen**, haptics and animated UI components

### Not built yet

- Signing back in to an existing account (the Sign In screen is empty)
- **Status** and **Calls** tabs (empty screens). The backend already forwards call signaling messages, but the app has no calling code.

## Screenshots

|Splash Screen | Home Screen | Chat Screen |
|---|---|---| 
| ![Splash Screen](assets/img/splash.jpg) | ![Home Screen](assets/img/home.jpg) | ![Chat Screen](assets/img/chat.jpg) |
| Profile Screen | Add new friend Screen | longPress Screen |
| ![Profile Screen](assets/img/profile.jpg) | ![New Friend Screen](assets/img/newfriend.jpg) | ![Long Press](assets/img/longpress.jpg) |
| ![Reaction Screen](assets/img/reactions.jpg) | ![Reply Screen](assets/img/reply.jpg) | ![Upload screen](assets/img/upload.jpg) |

## Technology Stack

| Area | Technology |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, React 19 (new architecture enabled) |
| Language | TypeScript |
| Styling | NativeWind 4 (Tailwind CSS 3) |
| Navigation | React Navigation 7 (native stack and bottom tabs) |
| Real-time | Browser-style `WebSocket` to the backend's `/chat` endpoint |
| HTTP | `fetch` with `FormData` for account creation and uploads |
| Storage | `@react-native-async-storage/async-storage` (user id, theme) |
| Media | `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`, `expo-file-system` |
| UI helpers | Reanimated 4, gesture handler, haptic feedback, country code pickers, alert notifications |

Several installed packages are not used by any screen yet: `@notifee/react-native`, `react-native-incall-manager`, `react-native-sound`, `react-native-keep-awake` and `axios`. They were added for notifications and calling.

## Project Structure

```text
LinkUp/
├── App.tsx                  # Providers (auth, WebSocket, theme) and navigation
├── index.ts                 # Expo entry point
├── src/
│   ├── api/                 # HTTP calls (UserService: sign-up, profile image, status image)
│   ├── components/          # AuthProvider, chat bubble, media picker, media gallery, UI pieces
│   ├── config/api.ts        # API and WebSocket URLs read from environment variables
│   ├── screens/             # Splash, SignUp, Contact, Avatar, Home tabs, Chats, SingleChat,
│   │                        # NewChat, NewContact, Profile, Setting, Calls, Status, SignIn
│   ├── socket/              # WebSocket provider, send and receive helpers
│   ├── theme/               # Light/dark/system theme provider
│   └── util/                # Validation and media upload helpers
├── assets/                  # Icons, fonts and README screenshots (assets/img)
├── app.json                 # Expo configuration
├── .env.example             # Backend address settings
├── package.json
└── tsconfig.json
```

## How it talks to the backend

| What | Transport | Endpoint (relative to `<server>/LinkUp`) |
|---|---|---|
| Create an account (name, number, photo) | `POST`, multipart | `/UserController` |
| Change profile photo | `POST`, multipart | `/ProfileController` |
| Upload a chat attachment | `POST`, multipart | `/MediaController` (the code currently calls `/PulseChat/MediaUploadController`, see Known Limitations) |
| Chat, contacts, profile data | WebSocket | `/chat?userId=<id>` |

WebSocket messages the app sends: `PING`, `get_chat_list`, `get_single_chat`, `send_message`, `get_all_users`, `save_new_contact`, `get_friend_data` and `set_user_profile`. The full protocol is in the [backend README](https://github.com/DhanikaJ/LinkUp-Backend#websocket-protocol).

## Getting Started

### Prerequisites

- Node.js (LTS) and npm
- The [LinkUp-Backend](https://github.com/DhanikaJ/LinkUp-Backend) running and reachable from your phone or emulator
- Android Studio (Android SDK) for `npm run android`. The project uses native modules that are not part of Expo Go, so run a **development build** (`expo run:android` / `expo run:ios`) instead of scanning a QR code with Expo Go.

### Install

```bash
git clone https://github.com/DhanikaJ/LinkUp.git
cd LinkUp
npm install
```

### Configure the backend address

Copy `.env.example` to `.env` and fill in your values:

```env
# REST base URL, WITHOUT the /LinkUp part (it is added automatically)
EXPO_PUBLIC_APP_URL=http://<your-computer-LAN-IP>:8080

# WebSocket: either a full URL ...
EXPO_PUBLIC_WS_FULL_URL=ws://<your-computer-LAN-IP>:8080/LinkUp

# ... or just a host (the app then builds wss://<host>/LinkUp, which needs HTTPS/TLS)
EXPO_PUBLIC_WS_URL=

# Text shown on the splash screen
EXPO_PUBLIC_APP_OWNER=Your Name
EXPO_PUBLIC_APP_VERSION=1.0
```

How the values are used:

- `EXPO_PUBLIC_API_BASE_URL` (optional) overrides `EXPO_PUBLIC_APP_URL`. Either way `/LinkUp` is appended unless it is already there.
- `EXPO_PUBLIC_WS_FULL_URL` wins over `EXPO_PUBLIC_WS_URL`. For local development use a full `ws://` URL. A bare host always becomes `wss://host/LinkUp`, which is meant for a tunnel such as ngrok.
- On a **real phone** use your computer's LAN IP. On the **Android emulator** use `10.0.2.2` instead of `localhost`.
- Restart Expo after editing `.env`. `.env` is ignored by git.
- `MediaGalleryView` reads one more variable, `EXPO_PUBLIC_API_URL`, that is not in `.env.example`. Set it to the same value as `EXPO_PUBLIC_APP_URL` if media thumbnails do not load.

### Run

```bash
npm run android      # build and run a development build (expo run:android)
npm run ios          # expo run:ios (macOS only)
npm start            # start the Metro bundler for an installed development build
```

`npm run web` starts the web version, but it will not work against the current backend, which sends no CORS headers.

## Usage

1. Start MySQL and the backend, then the app.
2. **Sign up:** enter your first and last name, then your country code and phone number, then choose a profile photo. You are signed in automatically.
3. Open **Chats**, tap the green button and pick a contact, or add a new contact with their name and number. The other person must already have an account with that number.
4. Open a conversation and send messages. Use the paperclip to send images, videos, audio or documents.
5. Long-press a message for the reply, copy and reaction menu.
6. Use **Settings** to switch between light, dark and system themes, and **Profile** to change your photo.

## Security notes

- **There is no authentication.** An account is just a name and a phone number (no password, no verification code), and the app keeps only the user id in AsyncStorage. The WebSocket connects with `?userId=<id>`, and the server trusts it. Anyone who knows another user's id can open a connection as that user. **Do not use real data** until proper authentication (for example OTP login and a server-issued token) is added.
- The backend allows requests from any origin.
- Use HTTPS/WSS outside your own network. Android release builds block plain HTTP traffic by default.

## Known Limitations

- **Sign In is an empty screen.** After signing out, or on a new phone, you can only create a new account, and an existing phone number is rejected.
- **Attachment upload URL:** `src/util/mediaUploadService.ts` posts to `/PulseChat/MediaUploadController`, which the backend does not provide (its servlet is `/MediaController`). Chat attachments fail until this is changed.
- **Reactions and replies are local:** reactions live in component state, and the backend has no reaction or reply fields.
- **Status and Calls tabs are empty.** There is no WebRTC library in the app, so calls cannot work yet, and `uploadStatusImage` has no matching backend endpoint.
- The splash screen waits a fixed 4 seconds before the app opens.
- `app.json` uses the placeholder Android package name `com.anonymous.LinkUp`.
- About 44 `console.*` debugging calls are left in the code, and there are no automated tests or CI.

## Future Enhancements

- Real authentication (OTP or password) and a working Sign In screen
- Fix the attachment upload URL and store reactions and replies on the server
- Voice and video calls using WebRTC, and the Status feature
- Push notifications for new messages
- Group chats, message deletion and delivery receipts for every message
- Automated tests and CI

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**DhanikaJ**  
Portfolio: [https://dhanikaj.dev](https://dhanikaj.dev)
