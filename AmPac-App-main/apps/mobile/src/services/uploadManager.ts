import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildStoragePath, uploadFileFromUri } from './upload';

const UPLOAD_QUEUE_KEY = 'upload_queue_v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface UploadJob {
    id: string;
    docId: string;
    uri: string;
    fileName: string;
    mimeType?: string;
    applicationId: string;
    userId: string;
    status: 'queued' | 'uploading' | 'completed' | 'failed';
    progress: number;
    retryCount: number;
    downloadUrl?: string;
    error?: string;
    createdAt: number;
}

type Subscriber = (jobs: UploadJob[]) => void;

class UploadManager {
    private jobs: Map<string, UploadJob> = new Map();
    private subscribers: Set<Subscriber> = new Set();
    private isProcessing = false;

    // Get all jobs
    getJobs(): UploadJob[] {
        return Array.from(this.jobs.values());
    }

    // Get job by docId
    getJobByDocId(docId: string): UploadJob | undefined {
        return Array.from(this.jobs.values()).find(j => j.docId === docId);
    }

    // Subscribe to job updates
    subscribe(callback: Subscriber): () => void {
        this.subscribers.add(callback);
        callback(this.getJobs());
        return () => this.subscribers.delete(callback);
    }

    private notify() {
        const jobs = this.getJobs();
        this.subscribers.forEach(cb => cb(jobs));
    }

    // Enqueue a new upload
    async enqueue(params: {
        docId: string;
        uri: string;
        fileName: string;
        mimeType?: string;
        applicationId: string;
        userId: string;
    }): Promise<UploadJob> {
        const job: UploadJob = {
            id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            docId: params.docId,
            uri: params.uri,
            fileName: params.fileName,
            mimeType: params.mimeType,
            applicationId: params.applicationId,
            userId: params.userId,
            status: 'queued',
            progress: 0,
            retryCount: 0,
            createdAt: Date.now(),
        };

        this.jobs.set(job.id, job);
        await this.persistQueue();
        this.notify();
        this.processQueue();

        return job;
    }

    // Process queued uploads
    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const queuedJobs = Array.from(this.jobs.values())
            .filter(j => j.status === 'queued')
            .sort((a, b) => a.createdAt - b.createdAt);

        for (const job of queuedJobs) {
            await this.processJob(job);
        }

        this.isProcessing = false;
    }

    private async processJob(job: UploadJob) {
        // Update status to uploading
        job.status = 'uploading';
        job.progress = 10;
        this.jobs.set(job.id, job);
        this.notify();

        try {
            const storagePath = buildStoragePath({
                userId: job.userId,
                applicationId: job.applicationId,
                docId: job.docId,
                fileName: job.fileName,
            });

            job.progress = 30;
            this.notify();

            const result = await uploadFileFromUri({
                uri: job.uri,
                path: storagePath,
                mimeType: job.mimeType,
                name: job.fileName,
            });

            job.status = 'completed';
            job.progress = 100;
            job.downloadUrl = result.downloadUrl;
            this.jobs.set(job.id, job);
            await this.persistQueue();
            this.notify();

        } catch (error: any) {
            console.error('Upload failed:', error);
            job.retryCount++;
            job.error = error.message || 'Upload failed';

            if (job.retryCount < MAX_RETRIES) {
                // Retry after delay
                job.status = 'queued';
                job.progress = 0;
                this.jobs.set(job.id, job);
                this.notify();

                setTimeout(() => this.processQueue(), RETRY_DELAY_MS * job.retryCount);
            } else {
                job.status = 'failed';
                this.jobs.set(job.id, job);
                await this.persistQueue();
                this.notify();
            }
        }
    }

    // Retry a failed job
    async retry(jobId: string) {
        const job = this.jobs.get(jobId);
        if (job && job.status === 'failed') {
            job.status = 'queued';
            job.retryCount = 0;
            job.progress = 0;
            job.error = undefined;
            this.jobs.set(jobId, job);
            this.notify();
            this.processQueue();
        }
    }

    // Remove a job
    async remove(jobId: string) {
        this.jobs.delete(jobId);
        await this.persistQueue();
        this.notify();
    }

    // Persist queue to storage
    private async persistQueue() {
        try {
            const jobs = this.getJobs().filter(j => j.status !== 'completed');
            await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(jobs));
        } catch (error) {
            console.error('Error persisting upload queue:', error);
        }
    }

    // Restore queue from storage (call on app start)
    async restoreQueue() {
        try {
            const stored = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
            if (stored) {
                const jobs: UploadJob[] = JSON.parse(stored);
                jobs.forEach(job => {
                    // Reset uploading jobs to queued
                    if (job.status === 'uploading') {
                        job.status = 'queued';
                        job.progress = 0;
                    }
                    this.jobs.set(job.id, job);
                });
                this.notify();
                this.processQueue();
            }
        } catch (error) {
            console.error('Error restoring upload queue:', error);
        }
    }

    // Get counts for UI
    getCounts(): { total: number; uploading: number; completed: number; failed: number } {
        const jobs = this.getJobs();
        return {
            total: jobs.length,
            uploading: jobs.filter(j => j.status === 'uploading' || j.status === 'queued').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
        };
    }
}

export const uploadManager = new UploadManager();
