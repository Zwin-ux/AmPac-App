// import 'react-native-gesture-handler/jestSetup'; // Removed to avoid potential issues

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Firebase Config
jest.mock('./firebaseConfig', () => ({
    db: {},
    auth: {
        currentUser: { uid: 'test-user-id', displayName: 'Test User' },
    },
    app: {},
}));

// Mock Firebase
jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(),
    getApp: jest.fn(),
    getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({
        currentUser: { uid: 'test-user-id', displayName: 'Test User' },
        onAuthStateChanged: jest.fn(),
    })),
    initializeAuth: jest.fn(),
    getReactNativePersistence: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
    },
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
    getStorage: jest.fn(),
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn(),
}));

// Mock auth utils
jest.mock('./src/services/authUtils', () => ({
    getCurrentUserId: jest.fn(() => 'test-user-id'),
}));

// Mock Expo constants
jest.mock('expo-constants', () => ({
    manifest: { extra: {} },
}));

// Mock Expo Auth Session
jest.mock('expo-auth-session', () => ({
    makeRedirectUri: jest.fn(),
    fetchDiscoveryAsync: jest.fn(),
    refreshAsync: jest.fn(),
    AuthRequest: jest.fn().mockImplementation(() => ({
        makeAuthUrlAsync: jest.fn(),
        promptAsync: jest.fn(),
        codeVerifier: 'test-verifier'
    })),
    exchangeCodeAsync: jest.fn(),
    ResponseType: { Code: 'code' },
}));

// Mock Expo Document Picker
jest.mock('expo-document-picker', () => ({
    getDocumentAsync: jest.fn(),
    DocumentPickerOptions: {},
}));

// Mock Expo Image Manipulator
jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn(),
    SaveFormat: {
        JPEG: 'jpeg',
        PNG: 'png',
    },
}));

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
    AntDesign: 'AntDesign',
    MaterialIcons: 'MaterialIcons',
}));

// Mock React Native components
jest.mock('react-native', () => {
    const mockAnimatedValue = {
        setValue: jest.fn(),
    };
    
    const mockAnimatedTiming = {
        start: jest.fn(),
    };
    
    return {
        View: 'View',
        Text: 'Text',
        TouchableOpacity: 'TouchableOpacity',
        StyleSheet: {
            create: (styles: any) => styles,
        },
        Animated: {
            Value: jest.fn(() => mockAnimatedValue),
            timing: jest.fn(() => mockAnimatedTiming),
            sequence: jest.fn(() => mockAnimatedTiming),
            loop: jest.fn(() => mockAnimatedTiming),
            View: 'Animated.View',
        },
    };
});

// Mock theme
jest.mock('./src/theme', () => ({
    theme: {
        colors: {
            primary: '#007AFF',
            success: '#34C759',
            error: '#FF3B30',
            info: '#5AC8FA',
            surface: '#FFFFFF',
            text: '#000000',
            textSecondary: '#666666',
            border: '#E5E5E5',
        },
        borderRadius: {
            md: 8,
        },
        shadows: {
            float: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
            },
            card: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
            },
        },
    },
}));
