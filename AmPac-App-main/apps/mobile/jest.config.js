module.exports = {
    preset: 'react-native',
    setupFilesAfterEnv: ['./test-setup.ts'],
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|@firebase|firebase|expo-.*|@expo/.*)/)',
    ],
    moduleNameMapper: {
        '^firebase/(.*)$': '<rootDir>/node_modules/firebase/$1',
    },
};
