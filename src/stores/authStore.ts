import { defineStore } from 'pinia';

export type Role = string;

const LS_TOKEN = 'auth.accessToken';
const LS_ROLES = 'auth.roles';

function readRoles(): Role[] {
  try {
    const raw = localStorage.getItem(LS_ROLES);
    return raw ? (JSON.parse(raw) as Role[]) : [];
  } catch {
    return [];
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(LS_TOKEN) ?? '',
    roles: readRoles(),
  }),

  getters: {
    isAuthenticated: (s) => Boolean(s.token),
    hasRole: (s) => (role: Role) => s.roles.includes(role),
    hasAnyRole: (s) => (roles: Role[]) => roles.some((r) => s.roles.includes(r)),
    isStaffOrAdmin: (s) => s.roles.includes('ROLE_ADMIN') || s.roles.includes('ROLE_STAFF'),
  },

  actions: {
    setAuth(token: string, roles: Role[]) {
      this.token = token;
      this.roles = roles;
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_ROLES, JSON.stringify(roles));
    },

    logout() {
      this.token = '';
      this.roles = [];
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_ROLES);
    },
  },
});
