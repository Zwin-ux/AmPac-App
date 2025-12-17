export type ErrorMessage = {
    title: string;
    detail?: string;
    action?: string;
};

export const errorMessages = {
    networkUnavailable: {
        title: "We can't reach AmPac right now.",
        detail: "Check your connection and try again.",
        action: "Try again",
    },
    serverHiccup: {
        title: "Something broke on our side.",
        detail: "Please try again in a moment.",
        action: "Retry",
    },
    sessionExpired: {
        title: "Your session timed out.",
        detail: "Please sign in again to keep your account secure.",
        action: "Sign in",
    },
    unauthorized: {
        title: "You don't have access to this.",
        detail: "If you need this feature, contact your AmPac rep.",
        action: "Okay",
    },
    validation: {
        title: "Please fix the highlighted fields.",
        detail: "We need a valid value before we can continue.",
        action: "Review fields",
    },
    uploadFailed: {
        title: "We couldn't upload that file.",
        detail: "Use PDF, JPG, or PNG under 10 MB and try again.",
        action: "Try again",
    },
    pricingUnavailable: {
        title: "Pricing isn't loading.",
        detail: "Refresh or try again shortly. We'll save your progress.",
        action: "Retry",
    },
    assistantUnavailable: {
        title: "The assistant is unavailable right now.",
        detail: "Please try again in a moment.",
        action: "Retry",
    },
    signInFailed: {
        title: "We couldn't sign you in.",
        detail: "Check your email and password, then try again.",
        action: "Try again",
    },
    signUpFailed: {
        title: "We couldn't create your account.",
        detail: "Please check your info and try again.",
        action: "Try again",
    },
    rateLimited: {
        title: "Too many requests.",
        detail: "Give it a few seconds and try again.",
        action: "Retry",
    },
    genericFallback: {
        title: "We hit a problem.",
        detail: "Your progress is saved. Try again or come back soon.",
        action: "Retry",
    },
} satisfies Record<string, ErrorMessage>;

export type ErrorKey = keyof typeof errorMessages;

export const getErrorMessage = (key: ErrorKey): ErrorMessage =>
    errorMessages[key] ?? errorMessages.genericFallback;
