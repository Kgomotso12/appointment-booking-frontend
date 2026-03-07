<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="q-pa-md flex flex-center">
        <q-card class="q-pa-lg" style="width: 420px; max-width: 92vw; border-radius: 16px">
          <div class="text-h6">Login</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Sign in to manage appointments (staff/admin).
          </div>

          <q-banner v-if="errorMsg" class="q-mt-md" rounded dense inline-actions>
            <template #avatar>
              <q-icon name="error_outline" />
            </template>
            {{ errorMsg }}
            <template #action>
              <q-btn flat dense label="Dismiss" @click="errorMsg = null" />
            </template>
          </q-banner>

          <q-form class="q-mt-md" @submit.prevent="onSubmit">
            <q-input
              v-model="email"
              label="Email"
              type="email"
              outlined
              dense
              :disable="submitting"
            />

            <q-input
              v-model="password"
              label="Password"
              type="password"
              outlined
              dense
              class="q-mt-sm"
              :disable="submitting"
            />

            <div class="row items-center justify-between q-mt-md">
              <q-btn unelevated color="primary" label="Login" type="submit" :loading="submitting" />
              <q-btn flat label="Back to booking" @click="goHome" />
            </div>
          </q-form>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { http, type FriendlyAxiosError } from 'src/services/http';
import { useAuthStore } from 'src/stores/authStore';

type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  roles: string[];
};

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref('');
const password = ref('');

const submitting = ref(false);
const errorMsg = ref<string | null>(null);

const fieldErrors = ref<{ email?: string; password?: string }>({});

const schema = z.object({
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function goHome() {
  void router.push('/');
}

async function onSubmit() {
  errorMsg.value = null;
  fieldErrors.value = {};

  const parsed = schema.safeParse({ email: email.value, password: password.value });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email') fieldErrors.value.email = issue.message;
      if (key === 'password') fieldErrors.value.password = issue.message;
    }
    return;
  }

  submitting.value = true;
  try {
    const res = await http.post<LoginResponse>('/v1/auth/login', {
      email: parsed.data.email,
      password: parsed.data.password,
    });

    auth.setAuth(res.data.accessToken, res.data.roles ?? []);

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    await router.replace(redirect || '/');
  } catch (e) {
    const err = e as FriendlyAxiosError;
    errorMsg.value = err.friendlyMessage ?? 'Login failed';
  } finally {
    submitting.value = false;
  }
}
</script>
