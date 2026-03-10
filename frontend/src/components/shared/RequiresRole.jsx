import { useAuth, ROLES } from '../../context/AuthContext';

const ROLE_HIERARCHY = {
    [ROLES.VIEWER]: 1,
    [ROLES.OPERATOR]: 2,
    [ROLES.ADMIN]: 3
};

export default function RequiresRole({ role, children, fallback = null }) {
    const { user } = useAuth();

    if (!user) return fallback;

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[role] ?? 99;

    if (userLevel >= requiredLevel) return children;
    return fallback;
}
