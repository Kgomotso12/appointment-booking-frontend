import { defineStore } from 'pinia';
import { getBranches } from 'src/services/branch.api';
import type { Branch } from 'src/types/domain';

type BranchState = {
  branches: Branch[];
  selectedBranchId: string | null;
  loading: boolean;
  error: string | null;
};

// This store manages the list of branches and the currently selected branch.
// It is used across the app to determine which branch's appointments to show.
export const useBranchStore = defineStore('branch', {
  state: (): BranchState => ({
    branches: [],
    selectedBranchId: null,
    loading: false,
    error: null,
  }),

  getters: {
    selectedBranch(state): Branch | null {
      return state.branches.find((b) => b.id === state.selectedBranchId) ?? null;
    },
  },

  actions: {
    async fetchBranches() {
      this.loading = true;
      this.error = null;

      try {
        const branches = await getBranches();
        this.branches = branches;

        if (!this.selectedBranchId && branches.length) {
          this.selectedBranchId = branches[0]!.id;
        }

        if (this.selectedBranchId && !branches.some((b) => b.id === this.selectedBranchId)) {
          this.selectedBranchId = branches[0]?.id ?? null;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load branches';
        this.error = msg;
        this.branches = [];
        this.selectedBranchId = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
