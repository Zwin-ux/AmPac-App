import { auth } from '../../firebaseConfig';

export const getFirebaseIdToken = async (): Promise<string> => {
    const user = auth.currentUser;
    const token = await user?.getIdToken();
    if (!token) {
        throw new Error('Not authenticated');
    }
    return token;
};

