// import 'react-native-gesture-handler/jestSetup'; // Removed to avoid potential issues

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
