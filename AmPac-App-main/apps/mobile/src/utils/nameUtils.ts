/**
 * Name Utilities
 * Functions for extracting and formatting user names
 */

/**
 * Extracts the first name from a full name string.
 * 
 * @param fullName - The full name string (e.g., "John Doe", "Jane", "Mary Jane Watson")
 * @param defaultName - The default name to return if fullName is empty/undefined (default: "Entrepreneur")
 * @returns The first name or the default name
 * 
 * @example
 * getFirstName("John Doe") // returns "John"
 * getFirstName("Jane") // returns "Jane"
 * getFirstName("") // returns "Entrepreneur"
 * getFirstName(undefined) // returns "Entrepreneur"
 * getFirstName("Mary Jane Watson") // returns "Mary"
 */
export function getFirstName(fullName: string | undefined | null, defaultName: string = 'Entrepreneur'): string {
    if (!fullName || typeof fullName !== 'string') {
        return defaultName;
    }
    
    const trimmed = fullName.trim();
    if (trimmed.length === 0) {
        return defaultName;
    }
    
    const firstName = trimmed.split(' ')[0];
    return firstName || defaultName;
}

/**
 * Gets the initial letter for avatar display
 * 
 * @param fullName - The full name string
 * @param defaultInitial - The default initial to return if fullName is empty (default: "E")
 * @returns The first character of the first name, uppercased
 */
export function getInitial(fullName: string | undefined | null, defaultInitial: string = 'E'): string {
    const firstName = getFirstName(fullName, '');
    if (firstName.length === 0) {
        return defaultInitial;
    }
    return firstName.charAt(0).toUpperCase();
}
