export interface NavBarView {
  showLoginLink: boolean;
  showEmail: boolean;
  showLogout: boolean;
}

export function getNavBarView(userEmail: string | null): NavBarView {
  if (userEmail) {
    return {
      showLoginLink: false,
      showEmail: true,
      showLogout: true,
    };
  }

  return {
    showLoginLink: true,
    showEmail: false,
    showLogout: false,
  };
}
