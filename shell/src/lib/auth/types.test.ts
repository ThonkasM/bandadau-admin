import { describe, expect, it } from 'vitest';

import { hasAnyRole, hasPanelAccess, homeFor } from './types';

describe('roles', () => {
  it('sin rol de panel no hay acceso', () => {
    expect(hasPanelAccess({ roles: ['STUDENT', 'ORGANIZER'] })).toBe(false);
    expect(hasPanelAccess(null)).toBe(false);
  });
  it('MODERATOR y ADMIN acceden', () => {
    expect(hasPanelAccess({ roles: ['MODERATOR'] })).toBe(true);
    expect(hasAnyRole({ roles: ['ADMIN'] }, ['ADMIN'])).toBe(true);
  });
  it('el inicio depende del rol', () => {
    expect(homeFor({ roles: ['ADMIN'] })).toBe('/dashboard/');
    expect(homeFor({ roles: ['MODERATOR'] })).toBe('/moderation/');
  });
});
