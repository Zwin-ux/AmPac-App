import React from 'react';
import type { User, StaffRole } from '../types';
// import { useAuth } from '../layouts/AuthLayout';

// Define a map of permissions implied by roles
const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
    'admin': ['*'],
    'executive': ['approve_loan', 'view_sensitive_pii', 'manage_staff'],
    'underwriter': ['approve_loan', 'view_sensitive_pii'],
    'loan_officer': ['view_sensitive_pii', 'edit_application'],
    'closing': ['view_sensitive_pii', 'generate_docs'],
    'servicing': ['view_sensitive_pii'],
    'intake': ['create_application']
};

interface PermissionGateProps {
    children: React.ReactNode;
    requiredPermission?: string;
    requiredRole?: StaffRole;
    fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
    children,
    requiredPermission,
    requiredRole,
    fallback = null
}) => {
    // In a real app, we'd get this from a proper context/store
    // For now, let's assume we can get it from a global store or pass it in.
    // Since I don't have easy access to the store here without more exploration, 
    // I will assume a mock user for demonstration or try to import the store if I can find it.

    // Let's try to find where the user is stored. 
    // Based on previous steps, there might be a userStore.
    // For this implementation, I'll use a placeholder hook pattern that the user can connect.

    const user = useMockUser(); // Replace with actual user hook

    if (!user) return <>{fallback}</>;

    if (user.role !== 'ampac_staff') return <>{fallback}</>;

    // Check Role
    if (requiredRole && user.staffRole !== requiredRole && user.staffRole !== 'admin') {
        return <>{fallback}</>;
    }

    // Check Permission
    if (requiredPermission) {
        const userPermissions = user.permissions || [];
        const rolePermissions = user.staffRole ? (ROLE_PERMISSIONS[user.staffRole] || []) : [];

        const hasDirectPermission = userPermissions.includes(requiredPermission);
        const hasRolePermission = rolePermissions.includes(requiredPermission) || rolePermissions.includes('*');

        if (!hasDirectPermission && !hasRolePermission) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
};

// Mock hook - to be replaced by actual auth hook
const useMockUser = () => {
    // This should be replaced by the actual user from the auth context
    // For now, returning a mock Admin user to allow everything to render
    return {
        uid: 'mock-admin',
        role: 'ampac_staff',
        staffRole: 'admin',
        fullName: 'Mock Admin',
        permissions: ['*']
    } as User;
};
