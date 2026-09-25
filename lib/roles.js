export function userRoles(user) {
  return [...new Set([...(user?.roles || []), user?.role].filter(Boolean))];
}

export function hasRole(user, ...roles) {
  return userRoles(user).some((role) => roles.includes(role));
}

export function withSectionRole(user, section) {
  if (!user) return user;
  return (hasRole(user, section) || hasRole(user, "administrator")) ? { ...user, role: section } : user;
}
