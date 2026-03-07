<template>
  <q-page class="q-pa-md">
    <BookingCalendar :branch-id="branchId" :refresh-key="refreshKey" :manage-token="manageToken" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import BookingCalendar from 'src/components/booking-calendar/BookingCalendar.vue';
import { useBranchStore } from 'src/stores/branchStore';

const route = useRoute();
const branchStore = useBranchStore();

const branchId = computed(() => branchStore.selectedBranch?.id.toString() ?? null);

const manageToken = computed(() => {
  const token = route.params.token;
  if (typeof token === 'string' && token.length > 0) {
    return token;
  }

  return null;
});

const refreshKey = ref(0);

watch(
  () => [branchId.value, manageToken.value],
  () => {
    refreshKey.value++;
  },
  { immediate: true },
);
</script>
