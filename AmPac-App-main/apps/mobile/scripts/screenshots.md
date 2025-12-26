# App Store Screenshot Guide

## Required Screenshots
Apple requires screenshots for these device sizes:
- **6.7" Display** (iPhone 15 Pro Max): 1290 x 2796 px
- **6.5" Display** (iPhone 14 Plus): 1284 x 2778 px  
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 px

## Recommended Screens to Capture

1. **Home Screen** - Dashboard with loan status and quick actions
2. **Application Screen** - Loan application form
3. **Spaces/Booking** - Room booking feature
4. **Calendar** - Personal calendar with events
5. **Social Hub** - Community feed and networking
6. **Support** - Hotline/concierge feature

## Quick Capture Methods

### Method 1: iOS Simulator (Mac Required)
```bash
# Start specific simulator
xcrun simctl boot "iPhone 15 Pro Max"

# Take screenshot
xcrun simctl io booted screenshot screenshot.png
```

### Method 2: Expo Go on Physical Device
1. Run `npx expo start`
2. Open on iPhone
3. Press Power + Volume Up to capture
4. AirDrop to Mac

### Method 3: Use Screenshot Frame Tools
- [Screenshots.pro](https://screenshots.pro)
- [AppMockUp](https://app-mockup.com)
- [Previewed](https://previewed.app)

These tools add device frames and marketing text to raw screenshots.

## Marketing Text Suggestions

| Screen | Headline |
|--------|----------|
| Home | "Your Business Capital Dashboard" |
| Application | "Apply for Funding in Minutes" |
| Spaces | "Book Meeting Rooms Instantly" |
| Calendar | "Stay Organized with Smart Calendar" |
| Social | "Connect with Fellow Entrepreneurs" |
| Support | "24/7 Concierge Support" |

## Upload to App Store Connect
1. Go to https://appstoreconnect.apple.com/apps/6756894718
2. Click your app → App Store → Prepare for Submission
3. Scroll to "Screenshots" section
4. Upload for each device size
