import { describe, expect, it } from 'vitest';

import { getNavBarView } from './nav-bar-view';

describe('getNavBarView', () => {
  it('returns login-only view when unauthenticated', () => {
    expect(getNavBarView(null)).toEqual({
      showLoginLink: true,
      showEmail: false,
      showLogout: false,
    });
  });

  it('returns authenticated view when user email exists', () => {
    expect(getNavBarView('dev@snag.local')).toEqual({
      showLoginLink: false,
      showEmail: true,
      showLogout: true,
    });
  });
});
