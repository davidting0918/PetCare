import React from 'react';
import { Crown, Users, Eye } from 'lucide-react';
import type { GroupRole, UserRole } from '../types';

/**
 * Unified role type that supports all role variants in the application
 */
export type RoleType = GroupRole | UserRole | 'owner';

/**
 * Configuration for role icon rendering
 */
export interface RoleIconConfig {
  size?: 'small' | 'default' | 'medium' | 'large' | string;
}

/**
 * Predefined icon size classes
 */
const ICON_SIZES = {
  small: 'w-3 h-3',
  default: 'w-4 h-4',
  medium: 'w-5 h-5',
  large: 'w-6 h-6',
} as const;

/**
 * Normalize role string to lowercase for consistent comparison
 */
const normalizeRoleForComparison = (role: RoleType): string => {
  return role.toLowerCase();
};

/**
 * Get the size class for icons
 */
const getIconSizeClass = (size?: string): string => {
  if (!size) return ICON_SIZES.default;
  if (size in ICON_SIZES) {
    return ICON_SIZES[size as keyof typeof ICON_SIZES];
  }
  return size; // Allow custom Tailwind classes
};

/**
 * Get the icon component for a role
 *
 * Token mapping:
 *   creator / owner → accent-pink (primary)
 *   member          → accent-teal (success)
 *   viewer          → text-tertiary (muted)
 *
 * @param role - The role to get the icon for
 * @param config - Optional configuration for icon size
 * @returns React element representing the role icon
 */
export const getRoleIcon = (
  role: RoleType,
  config?: RoleIconConfig
): React.ReactElement | null => {
  const sizeClass = getIconSizeClass(config?.size);
  const normalizedRole = normalizeRoleForComparison(role);

  switch (normalizedRole) {
    case 'creator':
    case 'owner':
      return <Crown className={`${sizeClass} text-accent-pink`} />;
    case 'member':
      return <Users className={`${sizeClass} text-accent-teal`} />;
    case 'viewer':
      return <Eye className={`${sizeClass} text-text-tertiary`} />;
    default:
      return null;
  }
};

/**
 * Get the color classes for a role badge
 *
 * Returns dark-token utility classes (accent-pink/teal/surface-2) so the
 * badge reads correctly on `surface-card` backgrounds.
 *
 * @param role - The role to get colors for
 * @returns Tailwind CSS classes for background, text, and border colors
 */
export const getRoleColor = (role: RoleType): string => {
  const normalizedRole = normalizeRoleForComparison(role);

  switch (normalizedRole) {
    case 'creator':
    case 'owner':
      return 'bg-accent-pink/15 text-accent-pink border-accent-pink/30';
    case 'member':
      return 'bg-accent-teal/15 text-accent-teal border-accent-teal/30';
    case 'viewer':
      return 'bg-surface-2 text-text-tertiary border-border-default';
    default:
      return 'bg-surface-2 text-text-tertiary border-border-default';
  }
};

/**
 * Get the display label for a role
 * @param role - The role to get the label for
 * @returns Formatted role label with proper capitalization
 */
export const getRoleLabel = (role: RoleType): string => {
  const normalizedRole = normalizeRoleForComparison(role);

  switch (normalizedRole) {
    case 'creator':
      return 'Creator';
    case 'owner':
      return 'Owner';
    case 'member':
      return 'Member';
    case 'viewer':
      return 'Viewer';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

/**
 * Get the display label for permission types (used in group pets)
 * @param permission - The permission level
 * @returns Formatted permission label
 */
export const getPermissionLabel = (permission: string): string => {
  const normalized = permission.toLowerCase();

  switch (normalized) {
    case 'owner':
      return 'Owner';
    case 'creator':
      return 'Group Creator';
    case 'member':
      return 'Group Member';
    case 'viewer':
      return 'Viewer';
    default:
      return permission;
  }
};

/**
 * Get color classes for permission badges
 *
 * Permission badges use the same accent assignment as role badges so the
 * member-vs-creator distinction stays visually consistent across the app.
 *
 * @param permission - The permission level
 * @returns Tailwind CSS classes for permission badge styling
 */
export const getPermissionColor = (permission: string): string => {
  const normalized = permission.toLowerCase();

  switch (normalized) {
    case 'owner':
      return 'bg-accent-pink/15 text-accent-pink border-accent-pink/30';
    case 'creator':
      return 'bg-accent-teal/15 text-accent-teal border-accent-teal/30';
    case 'member':
      return 'bg-accent-teal/10 text-accent-teal border-accent-teal/20';
    case 'viewer':
      return 'bg-surface-2 text-text-tertiary border-border-default';
    default:
      return 'bg-surface-2 text-text-tertiary border-border-default';
  }
};

/**
 * Normalize a GroupRole to UserRole format (capitalize first letter)
 * @param role - The GroupRole to normalize
 * @returns UserRole with proper capitalization
 */
export const normalizeRole = (role: GroupRole): UserRole => {
  return (role.charAt(0).toUpperCase() + role.slice(1)) as UserRole;
};
