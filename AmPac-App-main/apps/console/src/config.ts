// Default to the deployed Brain service; override via VITE_API_URL for staging/local.
export const API_URL = import.meta.env.VITE_API_URL || 'https://brain-service-952649324958.us-central1.run.app/api/v1';
