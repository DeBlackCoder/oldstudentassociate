export function adminMatchesMember(
  admin: { id: string; email: string; isActive: boolean },
  member: { adminId?: string; email: string },
): boolean {
  if (!admin.isActive) return false;
  if (member.adminId) return member.adminId === admin.id;
  return member.email.toLowerCase() === admin.email.toLowerCase();
}
