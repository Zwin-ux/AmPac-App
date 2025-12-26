import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

export type UploadResult = {
    downloadUrl: string;
    size: number;
    name?: string;
    contentType?: string;
};

const isImage = (mime?: string) => mime?.startsWith('image/');

const getExtensionFromName = (name?: string) => {
    if (!name) return '';
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot) : '';
};

export async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
    });

    if (result.canceled) return null;
    const asset = result.assets[0];
    return asset;
}

async function compressImageIfNeeded(uri: string, mimeType?: string) {
    if (!isImage(mimeType)) return { uri, mimeType };
    try {
        const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1600 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        return { uri: manipulated.uri, mimeType: 'image/jpeg' };
    } catch (error) {
        console.warn('Image compression failed, using original', error);
        return { uri, mimeType };
    }
}

export async function uploadFileFromUri(params: {
    uri: string;
    path: string;
    mimeType?: string;
    name?: string;
}): Promise<UploadResult> {
    const { uri, path, mimeType, name } = params;

    const maybeCompressed = await compressImageIfNeeded(uri, mimeType);
    const response = await fetch(maybeCompressed.uri);
    const blob = await response.blob();

    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: maybeCompressed.mimeType || mimeType });
    const downloadUrl = await getDownloadURL(fileRef);

    return {
        downloadUrl,
        size: blob.size,
        name,
        contentType: maybeCompressed.mimeType || mimeType,
    };
}

export function buildStoragePath(opts: { userId: string; applicationId: string; docId: string; fileName?: string }) {
    const ext = getExtensionFromName(opts.fileName);
    return `applications/${opts.userId}/${opts.applicationId}/${opts.docId}_${Date.now()}${ext}`;
}
