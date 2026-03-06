import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteLocationNormalized,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/authStore';

function getRequiredRoles(to: RouteLocationNormalized): string[] {
  const roles = to.meta?.roles;
  return Array.isArray(roles) ? (roles as string[]) : [];
}

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to) => {
    const requiresAuth = Boolean(to.meta?.requiresAuth);
    if (!requiresAuth) return true;

    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
      };
    }

    const requiredRoles = getRequiredRoles(to);
    if (requiredRoles.length > 0 && !auth.hasAnyRole(requiredRoles)) {
      return { path: '/' };
    }

    return true;
  });

  return Router;
});
