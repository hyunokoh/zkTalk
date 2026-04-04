# zkTalk App Icon Specifications

## Required Assets

### icon.png (App Icon)
- Size: 1024x1024 px
- Format: PNG, no alpha channel
- Background: #0a0a1a (dark navy)
- Foreground: zkTalk logo in #6366f1 (indigo) or white
- No rounded corners (OS applies them automatically)

### adaptive-icon.png (Android Adaptive Icon - Foreground)
- Size: 1024x1024 px
- Format: PNG with alpha
- Safe zone: center 66% (the outer 17% on each side may be clipped)
- Background color defined in app.json: #0a0a1a

### notification-icon.png (Push Notification Icon - Android)
- Size: 96x96 px
- Format: PNG with alpha
- Must be single color (white silhouette on transparent)
- Used for Android notification bar

### splash-icon.png (Optional - Splash screen logo)
- Size: 200x200 px (will be centered on splash background)
- Format: PNG with alpha
- Background is set via app.json splash.backgroundColor: #0a0a1a

## Design Guidelines
- The zkTalk brand uses indigo (#6366f1) as the primary accent
- Dark theme: background #0a0a1a, surface #1a1a2e
- Typography: clean, modern sans-serif
- Icon should convey: privacy, community, messaging
