import type { Router } from 'vue-router';

let routerInstance: Router | null = null;

export function setRouter(router: Router) {
  routerInstance = router;
}

export function getRouter(): Router | null {
  return routerInstance;
}
