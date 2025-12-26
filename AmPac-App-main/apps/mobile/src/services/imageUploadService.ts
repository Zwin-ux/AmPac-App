import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

export interface ImageUploadOptions {
    maxImages?: number;
    quality?: number;
    allowCamera?: boolean;
    allowGallery?: boolean;
}

export const imageUploadService = {
    /**
     * Pick images from gallery and upload to Firebase Storage
     * @param folder - Storage folder ('posts', 'events', 'businesses')
     * @param itemId - Unique ID for the item
     * @param options - Upload options
     * @returns Array of download URLs
     */
    pickAndUploadImages: async (
        folder: 'posts' | 'events' | 'businesses',
        itemId: string,
        options: ImageUploadOptions = {}
    ): Promise<string[]> => {
        const {
            maxImages = 3,
            quality = 0.7,
            allowGallery = true,
        } = options;

        if (!allowGallery) {
            throw new Error('Gallery access not allowed');
        }

        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permission to access gallery denied. Please enable in settings.');
        }

        // Pick images
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: maxImages > 1,
            quality,
            aspect: [16, 9],
            allowsEditing: maxImages === 1, // Allow editing for single image
        });

        if (result.canceled) {
            return [];
        }

        const uploadedUrls: string[] = [];

        // Upload each selected image
        for (let i = 0; i < Math.min(result.assets.length, maxImages); i++) {
            const asset = result.assets[i];

            try {
                // Fetch the image as a blob
                const response = await fetch(asset.uri);
                const blob = await response.blob();

                // Create storage reference
                const timestamp = Date.now();
                const storageRef = ref(storage, `${folder}/${itemId}/image_${timestamp}_${i}.jpg`);

                // Upload to Firebase Storage
                await uploadBytes(storageRef, blob);

                // Get download URL
                const downloadUrl = await getDownloadURL(storageRef);
                uploadedUrls.push(downloadUrl);
            } catch (error) {
                console.error(`Error uploading image ${i}:`, error);
                // Continue with other images even if one fails
            }
        }

        return uploadedUrls;
    },

    /**
     * Take a photo with camera and upload to Firebase Storage
     * @param folder - Storage folder
     * @param itemId - Unique ID for the item
     * @param options - Upload options
     * @returns Download URL or null
     */
    takeCameraPhoto: async (
        folder: 'posts' | 'events' | 'businesses',
        itemId: string,
        options: ImageUploadOptions = {}
    ): Promise<string | null> => {
        const { quality = 0.7, allowCamera = true } = options;

        if (!allowCamera) {
            throw new Error('Camera access not allowed');
        }

        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permission to access camera denied. Please enable in settings.');
        }

        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
            quality,
            aspect: [16, 9],
            allowsEditing: true,
        });

        if (result.canceled) {
            return null;
        }

        try {
            // Fetch the image as a blob
            const response = await fetch(result.assets[0].uri);
            const blob = await response.blob();

            // Create storage reference
            const timestamp = Date.now();
            const storageRef = ref(storage, `${folder}/${itemId}/camera_${timestamp}.jpg`);

            // Upload to Firebase Storage
            await uploadBytes(storageRef, blob);

            // Get and return download URL
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error('Error uploading camera photo:', error);
            throw error;
        }
    },

    /**
     * Delete an image from Firebase Storage
     * @param imageUrl - Full download URL of the image
     */
    deleteImage: async (imageUrl: string): Promise<void> => {
        try {
            // Extract path from URL
            const urlObj = new URL(imageUrl);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
            if (!pathMatch) {
                throw new Error('Invalid image URL');
            }

            const path = decodeURIComponent(pathMatch[1]);
            const storageRef = ref(storage, path);

            // Delete from storage
            const { deleteObject } = await import('firebase/storage');
            await deleteObject(storageRef);
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    },
};
