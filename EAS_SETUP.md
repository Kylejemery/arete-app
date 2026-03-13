# EAS Build Setup

Before running your first EAS build, complete these steps:

## 1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

## 2. Link the project to your Expo account
```bash
eas init
```
This sets the `extra.eas.projectId` in `app.json`. Run this once and commit the updated `app.json`.

## 3. Fill in `eas.json` submit placeholders
Open `eas.json` and replace the placeholder values in `submit.production.ios`:
- `PLACEHOLDER_APPLE_ID` → your Apple ID email
- `PLACEHOLDER_ASC_APP_ID` → your App Store Connect App ID (found in App Store Connect under App Information)
- `PLACEHOLDER_APPLE_TEAM_ID` → your Apple Team ID (found at developer.apple.com/account under Membership)

## 4. Configure credentials
```bash
eas credentials
```

## 5. Run your first build
```bash
# Development build (runs in simulator)
eas build --platform ios --profile development

# Production build (for App Store submission)
eas build --platform ios --profile production
```

## 6. Submit to App Store
```bash
eas submit --platform ios --profile production
```
