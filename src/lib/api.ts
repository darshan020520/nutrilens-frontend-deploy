import { httpClient as api } from "@/core/api/httpClient";
import { getEndpoint } from "@/core/api/endpoints";

export { api, getEndpoint };

export const authAPI = {
  register: async (email: string, password: string) => {
    const response = await api.post(getEndpoint("/auth/register"), { email, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    const response = await api.post(getEndpoint("/auth/login"), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get(getEndpoint("/auth/me"));
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await api.post(getEndpoint("/auth/verify-email"), { token });
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await api.post(getEndpoint("/auth/resend-verification"), { email });
    return response.data;
  },

  updateWhatsappNumber: async (whatsapp_number: string) => {
    const response = await api.put(getEndpoint("/auth/whatsapp-number"), { whatsapp_number });
    return response.data;
  },

  getNotificationPreferences: async () => {
    const response = await api.get(getEndpoint("/auth/notification-preferences"));
    return response.data;
  },

  updateNotificationPreferences: async (data: {
    enabled_providers?: string[];
    enabled_types?: string[];
    quiet_hours_start?: number;
    quiet_hours_end?: number;
    timezone?: string;
  }) => {
    const response = await api.put(getEndpoint("/auth/notification-preferences"), data);
    return response.data;
  },
};

export const onboardingAPI = {
  submitBasicInfo: async (data: Record<string, unknown>) => {
    const response = await api.post(getEndpoint("/onboarding/basic-info"), data);
    return response.data;
  },

  submitGoal: async (data: Record<string, unknown>) => {
    const response = await api.post(getEndpoint("/onboarding/goal-selection"), data);
    return response.data;
  },

  submitPath: async (data: Record<string, unknown>) => {
    const response = await api.post(getEndpoint("/onboarding/path-selection"), data);
    return response.data;
  },

  submitPreferences: async (data: Record<string, unknown>) => {
    const response = await api.post(getEndpoint("/onboarding/preferences"), data);
    return response.data;
  },

  getCalculatedTargets: async () => {
    const response = await api.get(getEndpoint("/onboarding/calculated-targets"));
    return response.data;
  },

  lockTargets: async (data: {
    goal_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => {
    const response = await api.post(getEndpoint("/onboarding/lock-targets"), data);
    return response.data;
  },
};
