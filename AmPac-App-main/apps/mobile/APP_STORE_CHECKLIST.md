# AmPac Capital - App Store Submission Checklist

## 🎯 Pre-Build Requirements

### ✅ App Configuration
- [x] Bundle identifier: `com.ampac.borrower`
- [x] App name: "AmPac Capital"
- [x] Version: 1.0.0
- [x] Privacy descriptions added to Info.plist
- [x] Non-exempt encryption declaration

### 📱 Required Assets (Create these in ./assets/)
- [ ] **App Icon** (1024x1024px) - `icon.png` ✅ (exists)
- [ ] **Splash Screen** - `splash-icon.png` ✅ (exists)
- [ ] **Screenshots** (Required for App Store):
  - [ ] iPhone 6.7" (1290x2796px) - 3 screenshots minimum
  - [ ] iPhone 6.5" (1242x2688px) - 3 screenshots minimum
  - [ ] iPad Pro 12.9" (2048x2732px) - 3 screenshots minimum
- [ ] **App Preview Video** (Optional but recommended)

### 🔐 Apple Developer Account Setup
- [x] Apple Developer Account: info@ampac.com
- [x] Team ID: Q87HNHL9QW
- [x] Distribution Certificate: Valid until Dec 23, 2026
- [x] Provisioning Profile: Active
- [ ] **App Store Connect App ID** (Need to get this)

## 🚀 Build Process

### Step 1: Clean Build
```bash
cd AmPac-App-main/apps/mobile
npm install
npx expo install --fix
```

### Step 2: Test Local Build
```bash
npx expo run:ios --configuration Release
```

### Step 3: EAS Production Build
```bash
eas build --platform ios --profile production --clear-cache
```

### Step 4: Submit to App Store
```bash
eas submit --platform ios --profile production
```

## 📋 App Store Connect Requirements

### App Information
- **App Name**: AmPac Capital
- **Subtitle**: Business Capital & Community Platform
- **Category**: Business
- **Content Rating**: 4+ (No objectionable content)

### App Description (Sample)
```
AmPac Capital connects borrowers with business funding opportunities and creates a supportive community for entrepreneurs.

Key Features:
• Apply for business loans and funding
• Connect with other entrepreneurs
• Access business resources and support
• Schedule meetings and consultations
• Real-time chat and networking

Perfect for small business owners, entrepreneurs, and anyone seeking business capital or community support.
```

### Keywords (100 characters max)
```
business,loan,funding,capital,entrepreneur,network,community,chat,finance,startup
```

### Privacy Policy & Terms
- [ ] Privacy Policy URL: https://ampac.com/privacy
- [ ] Terms of Service URL: https://ampac.com/terms

## 🔍 App Review Guidelines Compliance

### Content Guidelines
- [x] No inappropriate content
- [x] Business/productivity focused
- [x] Clear value proposition

### Technical Guidelines
- [x] Uses standard iOS UI components
- [x] Follows iOS Human Interface Guidelines
- [x] Proper error handling
- [x] Network connectivity handling

### Privacy Guidelines
- [x] Clear privacy descriptions
- [x] User consent for data collection
- [x] Secure data transmission (HTTPS)

## 🐛 Common Rejection Reasons to Avoid

### Design Issues
- [ ] App crashes on launch
- [ ] Broken features or buttons
- [ ] Poor user interface
- [ ] Missing content or placeholder text

### Functionality Issues
- [ ] App doesn't work as described
- [ ] Missing core functionality
- [ ] Login issues
- [ ] Network connectivity problems

### Metadata Issues
- [ ] Screenshots don't match app
- [ ] Misleading app description
- [ ] Wrong category selection
- [ ] Missing privacy policy

## 📞 Support Information
- **Support URL**: https://ampac.com/support
- **Support Email**: support@ampac.com
- **Marketing URL**: https://ampac.com

## 🎯 Next Steps After Approval
1. Monitor crash reports and user feedback
2. Plan regular updates (monthly recommended)
3. Respond to user reviews
4. Track app analytics and performance
5. Prepare marketing materials

---

## 🚨 Critical Notes
- Test the app thoroughly on physical iOS devices
- Ensure all features work without internet (graceful degradation)
- Test with different iOS versions (iOS 15+)
- Verify all external links work correctly
- Make sure the app provides value without requiring account creation (or provide demo mode)