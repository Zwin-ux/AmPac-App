import { graphCalendarService } from './microsoftGraph';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetch
global.fetch = jest.fn();

describe('graphCalendarService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkConnectionStatus', () => {
        it('should return false if no token in storage', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
            const status = await graphCalendarService.checkConnectionStatus();
            expect(status).toBe(false);
        });

        it('should return true if token is valid', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
                accessToken: 'token',
                expiresAt: Date.now() + 10000
            }));
            const status = await graphCalendarService.checkConnectionStatus();
            console.log('Test status check:', status);
            expect(status).toBe(true);
        });

        it('should return true if token is expired but has refresh token', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
                accessToken: 'token',
                refreshToken: 'refresh',
                expiresAt: Date.now() - 10000
            }));
            const status = await graphCalendarService.checkConnectionStatus();
            expect(status).toBe(true);
        });
    });

    describe('getUserProfile', () => {
        it('should fetch profile if token exists', async () => {
            // Mock ensureAccessToken to return a token directly or rely on storage
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
                accessToken: 'valid-token',
                expiresAt: Date.now() + 10000
            }));

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ mail: 'test@test.com' })
            });

            const profile = await graphCalendarService.getUserProfile();
            expect(profile).toEqual({ mail: 'test@test.com' });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/me'),
                expect.anything()
            );
        });

        it('should return null if fetch fails', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
                accessToken: 'valid-token',
                expiresAt: Date.now() + 10000
            }));

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false
            });

            const profile = await graphCalendarService.getUserProfile();
            expect(profile).toBeNull();
        });
    });
});
