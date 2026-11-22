import type { LlmModel, LlmProvider } from "@codesense/shared";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  useDeleteLlmKey,
  useLlmModels,
  useSetLlmKey,
  useUpdateLlmPreference
} from "@/features/settings/hooks/use-llm";
import { getErrorMessage } from "@/lib/api-client";
import { safeHref } from "@/lib/safe-href";
import { useAuthStore } from "@/stores/auth.store";

const PROVIDERS: Array<{
  provider: LlmProvider;
  label: string;
  privacyUrl: string;
}> = [
  {
    provider: "groq",
    label: "Groq",
    privacyUrl: "https://groq.com/privacy-policy"
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    privacyUrl: "https://openrouter.ai/privacy"
  }
];

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  groq: "Groq",
  openrouter: "OpenRouter"
};

function toSelectionValue(provider: LlmProvider, modelId: string): string {
  return `${provider}:${modelId}`;
}

function parseSelectionValue(
  value: string
): { provider: LlmProvider; modelId: string } | null {
  const [provider, modelId] = value.split(":");

  if (
    (provider === "groq" || provider === "openrouter") &&
    modelId &&
    modelId.length > 0
  ) {
    return { provider, modelId };
  }

  return null;
}

export function AiModelSection(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const modelsQuery = useLlmModels();
  const updatePreference = useUpdateLlmPreference();
  const setKey = useSetLlmKey();
  const deleteKey = useDeleteLlmKey();

  const models = modelsQuery.data?.models ?? [];
  const availableProviders = modelsQuery.data?.availableProviders ?? [];

  const [selection, setSelection] = useState("");
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [keyValues, setKeyValues] = useState<Record<LlmProvider, string>>({
    groq: "",
    openrouter: ""
  });

  useEffect(() => {
    const data = modelsQuery.data;

    if (!data) {
      return;
    }

    const defaultModel =
      data.models.find((model) => model.default === true) ?? data.models[0];
    const initial = data.preference ?? defaultModel;

    if (initial) {
      setSelection(toSelectionValue(initial.provider, initial.modelId));
    }

    setFallbackEnabled(data.preference?.fallbackEnabled ?? false);
  }, [modelsQuery.data]);

  function isAvailable(provider: LlmProvider): boolean {
    return availableProviders.includes(provider);
  }

  function hasKey(provider: LlmProvider): boolean {
    return Boolean(user?.llmKeys?.[provider]);
  }

  const savePreference = (): void => {
    const parsed = parseSelectionValue(selection);

    if (!parsed) {
      return;
    }

    updatePreference.mutate({
      provider: parsed.provider,
      modelId: parsed.modelId,
      fallbackEnabled
    });
  };

  const selectedProvider = parseSelectionValue(selection)?.provider ?? "groq";
  const privacyUrl =
    PROVIDERS.find((entry) => entry.provider === selectedProvider)?.privacyUrl ??
    PROVIDERS[0].privacyUrl;

  const apiError =
    updatePreference.error ?? setKey.error ?? deleteKey.error ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI summary</CardTitle>
        <CardDescription>
          Choose which free, hosted open-weight model writes your codebase
          summaries.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {apiError ? (
          <Alert variant="destructive" title="Unable to update AI settings">
            {getErrorMessage(apiError)}
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3">
          <FormField
            id="llm-model"
            label="Model"
            hint="All listed models are free, with per-provider daily limits."
          >
            <Select
              id="llm-model"
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
              disabled={modelsQuery.isLoading}
            >
              {PROVIDERS.map(({ provider, label }) => {
                const providerModels = models.filter(
                  (model) => model.provider === provider
                );

                if (providerModels.length === 0) {
                  return null;
                }

                return (
                  <optgroup key={provider} label={label}>
                    {providerModels.map((model: LlmModel) => (
                      <option
                        key={model.modelId}
                        value={toSelectionValue(model.provider, model.modelId)}
                      >
                        {model.label}
                        {isAvailable(model.provider)
                          ? ""
                          : " — Unavailable (no key)"}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
          </FormField>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">Free</Badge>
            <span className="text-xs text-muted-foreground">
              Summaries may hit provider free-tier limits.
            </span>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fallbackEnabled}
              onChange={(event) => setFallbackEnabled(event.target.checked)}
              className="h-4 w-4 rounded-none border-input"
            />
            Fall back to another provider when a rate limit is hit
          </label>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={savePreference}
              isLoading={updatePreference.isPending}
              disabled={!parseSelectionValue(selection)}
            >
              Save preference
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Provider API keys
          </h3>

          {PROVIDERS.map(({ provider, label }) => (
            <div
              key={provider}
              className="flex flex-col gap-2 rounded-none border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{label}</span>
                {hasKey(provider) ? (
                  <Badge variant="success">Key set</Badge>
                ) : (
                  <Badge variant="secondary">Not set</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <PasswordInput
                  value={keyValues[provider]}
                  onChange={(event) =>
                    setKeyValues((current) => ({
                      ...current,
                      [provider]: event.target.value
                    }))
                  }
                  placeholder="Enter API key"
                  aria-label={`${label} API key`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setKey.mutate({
                      provider,
                      apiKey: keyValues[provider]
                    })
                  }
                  disabled={keyValues[provider].trim().length === 0}
                  isLoading={setKey.isPending}
                >
                  Save
                </Button>
                {hasKey(provider) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => deleteKey.mutate(provider)}
                    disabled={deleteKey.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Summaries send repository metadata to the selected provider.{" "}
          <a
            href={safeHref(privacyUrl)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {PROVIDER_LABELS[selectedProvider]} privacy policy
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
