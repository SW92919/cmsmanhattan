# Mobile Build Setup

This document explains the mobile build setup and the changes made for mobile compatibility.

## Capacitor Plugins Installed

The following Capacitor plugins have been installed for mobile functionality:

- `@capacitor/filesystem` - For file operations on mobile devices
- `@capacitor/preferences` - For persistent storage on mobile devices

## Key Changes Made

### 1. File Download Compatibility

**File:** `src/app/mail-message/mail-message.component.ts`

- **Problem:** The original `downloadAttachment` method used `window.URL.createObjectURL()` which doesn't work reliably on mobile devices.
- **Solution:** Implemented platform-aware file download:
  - **Web:** Uses the original browser download method
  - **Mobile:** Uses Capacitor Filesystem API to save files to the device's Documents directory
- **Features:**
  - Automatic platform detection using `Capacitor.isNativePlatform()`
  - Toast notifications for success/error feedback
  - Support for various response formats (Blob, ArrayBuffer, base64)

### 2. Theme Persistence

**Files:** 
- `src/app/theme.service.ts` (new)
- `src/app/folders/folders.component.ts`
- `src/app/app.component.ts`

- **Problem:** Theme preferences were stored in localStorage, which doesn't persist properly across app launches on mobile.
- **Solution:** Created a centralized ThemeService using Capacitor Preferences:
  - **Web:** Falls back to localStorage if Preferences API fails
  - **Mobile:** Uses Capacitor Preferences for persistent storage
  - **Features:**
    - Reactive theme state management with RxJS
    - Automatic system theme detection on web
    - Graceful fallbacks for error handling

## Building for Mobile

### Prerequisites

1. Install Capacitor CLI globally:
   ```bash
   npm install -g @capacitor/cli
   ```

2. Build the Angular app:
   ```bash
   npm run build
   ```

3. Add platforms:
   ```bash
   npx cap add android
   npx cap add ios
   ```

4. Sync the build:
   ```bash
   npx cap sync
   ```

### Android Build

1. Open Android Studio:
   ```bash
   npx cap open android
   ```

2. Build APK in Android Studio or via command line:
   ```bash
   npx cap build android
   ```

### iOS Build

1. Open Xcode:
   ```bash
   npx cap open ios
   ```

2. Build in Xcode

## Environment Configuration

The app uses environment-based API URLs:

- **Development:** `http://127.0.0.1:4200/api/`
- **Production:** `https://www.cmsmanhattan.com:8097/api/`

For mobile builds, ensure your production API URL is accessible from mobile devices.

## Testing Mobile Features

### File Downloads
- Test attachment downloads on both web and mobile
- Verify files are saved to the correct location on mobile devices
- Check toast notifications appear correctly

### Theme Persistence
- Toggle dark/light mode
- Restart the app and verify theme preference is maintained
- Test on both web and mobile platforms

## Troubleshooting

### File Download Issues
- Ensure the API returns the correct file format
- Check device permissions for file storage
- Verify the Filesystem plugin is properly installed

### Theme Issues
- Clear app data if theme gets stuck
- Check console for Preferences API errors
- Verify the theme service is properly injected

## Additional Considerations

1. **Permissions:** Android may require storage permissions for file downloads
2. **File Types:** Some file types may need special handling or external apps to open
3. **Performance:** Large files may need progress indicators
4. **Security:** Consider implementing file type validation for downloads 