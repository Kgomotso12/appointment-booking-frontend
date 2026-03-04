<template>
  <q-page class="q-pa-md">
    <BookingCalendar :branch-id="branchId" :refresh-key="refreshKey" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BookingCalendar from 'src/components/booking-calendar/BookingCalendar.vue';
import { useBranchStore } from 'src/stores/branchStore';

const branchStore = useBranchStore();
const branchId = computed(() => branchStore.selectedBranch?.id ?? null);
const refreshKey = ref(0);

watch(branchId, () => refreshKey.value++, { immediate: true });
</script>
