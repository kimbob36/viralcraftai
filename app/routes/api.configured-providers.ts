import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/cloudflare';

import { LOCAL_PROVIDERS } from '~/lib/stores/settings';

interface ConfiguredProvider {
  name: string;
  isConfigured: boolean;
  configMethod: 'environment' | 'none';
}

interface ConfiguredProvidersResponse {
  providers: ConfiguredProvider[];
}

/**
 * API endpoint that detects which providers are configured via environment variables
 * This helps auto-enable providers that have been set up by the user
 */
export const loader: LoaderFunction = async ({ context }) => {
  try {
    const { LLMManager } = await import('~/lib/modules/llm/manager');
    const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);

    const configuredProviders: ConfiguredProvider[] = [];

    for (const providerName of LOCAL_PROVIDERS) {
      const providerInstance = llmManager.getProvider(providerName);

      let isConfigured = false;
      let configMethod: 'environment' | 'none' = 'none';

      if (providerInstance) {
        const config = providerInstance.config;

        if (config.baseUrlKey) {
          const baseUrlEnvVar = config.baseUrlKey;

          const cloudflareEnv = (context?.cloudflare?.env as Record<string, any>)?.[baseUrlEnvVar];
          const processEnv = process.env[baseUrlEnvVar];
          const managerEnv = llmManager.env[baseUrlEnvVar];
          const envBaseUrl = cloudflareEnv || processEnv || managerEnv;

          const isValidEnvValue =
            envBaseUrl &&
            typeof envBaseUrl === 'string' &&
            envBaseUrl.trim().length > 0 &&
            !envBaseUrl.includes('your_') &&
            !envBaseUrl.includes('_here') &&
            envBaseUrl.startsWith('http');

          if (isValidEnvValue) {
            isConfigured = true;
            configMethod = 'environment';
          }
        }

        if (config.apiTokenKey && !isConfigured) {
          const apiTokenEnvVar = config.apiTokenKey;

          const cloudflareApiToken = (context?.cloudflare?.env as Record<string, any>)?.[apiTokenEnvVar];
          const processApiToken = process.env[apiTokenEnvVar];
          const managerApiToken = llmManager.env[apiTokenEnvVar];
          const envApiToken = cloudflareApiToken || processApiToken || managerApiToken;

          const isValidApiToken =
            envApiToken &&
            typeof envApiToken === 'string' &&
            envApiToken.trim().length > 0 &&
            !envApiToken.includes('your_') &&
            !envApiToken.includes('_here') &&
            envApiToken.length > 10;

          if (isValidApiToken) {
            isConfigured = true;
            configMethod = 'environment';
          }
        }
      }

      configuredProviders.push({
        name: providerName,
        isConfigured,
        configMethod,
      });
    }

    return json<ConfiguredProvidersResponse>({
      providers: configuredProviders,
    });
  } catch (error) {
    console.error('Error detecting configured providers:', error);

    return json<ConfiguredProvidersResponse>({
      providers: LOCAL_PROVIDERS.map((name) => ({
        name,
        isConfigured: false,
        configMethod: 'none' as const,
      })),
    });
  }
};
