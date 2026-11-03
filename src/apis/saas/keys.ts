export const orgKeys = {
  all: ['org'] as const,
  me: ['org', 'me'] as const,
  scoped: (orgId: string) => ['org', orgId] as const,
  list: (orgId: string, resource: string) => ['org', orgId, resource] as const,
  detail: (orgId: string, resource: string, id: string) => ['org', orgId, resource, id] as const,
};
