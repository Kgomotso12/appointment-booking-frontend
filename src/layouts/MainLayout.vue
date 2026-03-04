<template>
  <q-layout view="hHh LpR fFf" class="bg-grey-1">
    <q-header class="hdr bg-white text-grey-9">
      <div class="hdr-inner">
        <q-toolbar class="q-px-none">
          <div class="row items-center no-wrap" style="gap: 12px; min-width: 0">
            <div class="brand">
              <div class="row items-center q-gutter-sm text-primary">
                <q-icon name="calendar_month" size="22px" />
                <span class="text-subtitle1 text-weight-semibold"> Appointment Booking </span>
              </div>
            </div>

            <q-separator vertical inset class="q-mx-sm gt-xs" />

            <q-select
              v-model="branchStore.selectedBranchId"
              :options="filteredBranchOptions"
              :loading="branchStore.loading"
              :disable="branchStore.loading || refreshing || !branchOptions.length"
              dense
              outlined
              emit-value
              map-options
              hide-bottom-space
              options-dense
              clearable
              use-input
              input-debounce="150"
              fill-input
              behavior="menu"
              class="branch-select"
              @filter="onBranchFilter"
            >
              <template #prepend>
                <q-icon name="store" />
              </template>

              <template #selected-item="scope">
                <div class="column" style="min-width: 0; line-height: 1.15">
                  <div class="text-body2 text-weight-medium ellipsis">
                    {{ scope.opt.label }}
                  </div>
                  <div class="text-caption text-grey-7 ellipsis">
                    {{ scope.opt.address }}
                  </div>
                </div>
              </template>

              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-avatar size="28px" rounded class="bg-grey-2 text-grey-9">
                      <q-icon name="place" size="16px" />
                    </q-avatar>
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ scope.opt.label }}
                    </q-item-label>
                    <q-item-label caption>
                      {{ scope.opt.address }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>

              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-7">
                    <template v-if="branchStore.loading">Loading branches…</template>
                    <template v-else>No branches found</template>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <q-space />

          <div class="row items-center no-wrap" style="gap: 10px">
            <q-btn
              class="gt-xs"
              unelevated
              color="primary"
              icon="refresh"
              label="Refresh"
              :disable="branchStore.loading"
              :loading="refreshing"
              @click="onRefresh"
            />
            <q-btn
              class="lt-sm"
              round
              unelevated
              color="primary"
              icon="refresh"
              :disable="branchStore.loading"
              :loading="refreshing"
              @click="onRefresh"
            />
          </div>
        </q-toolbar>

        <!-- inline banner for branch loading errors / empty -->
        <q-slide-transition>
          <div v-if="showBranchBanner" class="q-mt-sm">
            <q-banner rounded dense inline-actions :class="branchBannerClass" class="banner">
              <template #avatar>
                <q-icon :name="branchBannerIcon" />
              </template>

              <div class="text-body2">
                {{ branchBannerText }}
              </div>

              <template #action>
                <q-btn
                  v-if="branchStore.error"
                  flat
                  dense
                  label="Retry"
                  :loading="branchStore.loading"
                  @click="retryBranches"
                />
              </template>
            </q-banner>
          </div>
        </q-slide-transition>
      </div>
    </q-header>

    <q-page-container>
      <q-page class="q-pa-md">
        <div class="page-shell">
          <booking-calendar :branch-id="branchStore.selectedBranchId" :refresh-key="refreshKey" />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BookingCalendar from 'components/booking-calendar/BookingCalendar.vue';
import { useBranchStore } from 'src/stores/branchStore';

defineOptions({ name: 'MainLayout' });

const branchStore = useBranchStore();

const refreshKey = ref(0);
const refreshing = ref(false);

const branchOptions = computed(() =>
  branchStore.branches.map((b) => ({
    label: b.name,
    value: b.id,
    address: b.address,
  })),
);

const branchQuery = ref('');

const filteredBranchOptions = computed(() => {
  const q = branchQuery.value.trim().toLowerCase();
  if (!q) return branchOptions.value;
  return branchOptions.value.filter((o) => {
    const hay = `${o.label} ${o.address}`.toLowerCase();
    return hay.includes(q);
  });
});

function onBranchFilter(val: string, update: (fn: () => void) => void) {
  update(() => {
    branchQuery.value = val;
  });
}

async function onRefresh() {
  try {
    refreshing.value = true;
    await branchStore.fetchBranches();
    refreshKey.value++;
  } finally {
    refreshing.value = false;
  }
}

async function retryBranches() {
  await branchStore.fetchBranches();
}

const showBranchBanner = computed(() => {
  if (branchStore.loading) return false;
  if (branchStore.error) return true;
  return branchOptions.value.length === 0;
});

const branchBannerText = computed(() => {
  if (branchStore.error) return branchStore.error;
  return 'No branches available yet. Add a branch to start booking.';
});

const branchBannerIcon = computed(() => (branchStore.error ? 'error_outline' : 'info'));

const branchBannerClass = computed(() =>
  branchStore.error ? 'bg-red-1 text-red-9' : 'bg-grey-2 text-grey-9',
);

onMounted(async () => {
  if (!branchStore.branches.length) {
    await branchStore.fetchBranches();
  }
});
</script>

<style scoped>
.page-shell {
  max-width: 1400px;
  margin: 0 auto;
}

.hdr {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.hdr-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px 16px 12px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.branch-select {
  width: 420px;
  max-width: 56vw;
}

.banner {
  border: 1px solid rgba(0, 0, 0, 0.06);
}

@media (max-width: 599px) {
  .branch-select {
    width: 100%;
    max-width: 100%;
  }
  .hdr-inner {
    padding: 10px 12px 12px;
  }
}
</style>
