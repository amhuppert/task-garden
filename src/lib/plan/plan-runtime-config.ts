export type PlanKey = string;

export type RuntimeConfigError = {
  type: "missing_plan_key";
  message: string;
};

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface RuntimeConfigValue {
  planKey: PlanKey;
}

export interface PlanRuntimeConfigService {
  resolve(): Result<RuntimeConfigValue, RuntimeConfigError>;
}

/** Testable factory — pass a plain env object to avoid import.meta.env in tests. */
export function createPlanRuntimeConfig(env: {
  VITE_PLAN_KEY?: string;
}): PlanRuntimeConfigService {
  return {
    resolve() {
      const planKey = env.VITE_PLAN_KEY;
      if (!planKey) {
        return {
          ok: false,
          error: {
            type: "missing_plan_key",
            message:
              "VITE_PLAN_KEY is not set. Add it to your .env file and restart the dev server.",
          },
        };
      }
      return { ok: true, value: { planKey } };
    },
  };
}

/** Singleton bound to Vite's import.meta.env for production and dev use. */
export const PlanRuntimeConfig: PlanRuntimeConfigService =
  createPlanRuntimeConfig(import.meta.env);
