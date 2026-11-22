import type { CreatedMcpTokenDTO, McpClientConfigs } from "@codesense/shared";
import { buildMcpClientConfigs } from "@codesense/shared";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  useCreateMcpToken,
  useMcpAccess,
  useRevokeMcpToken
} from "@/features/settings/hooks/use-mcp";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function ConfigBlock({
  title,
  value
}: {
  title: string;
  value: unknown;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const ok = await copyText(text);
            if (ok) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }
          }}
        >
          <Copy aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto border border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}

function createdConfigs(
  endpoint: string,
  token: string
): McpClientConfigs {
  return buildMcpClientConfigs(endpoint, token);
}

export function McpAccessSection(): React.ReactElement {
  const accessQuery = useMcpAccess();
  const createToken = useCreateMcpToken();
  const revokeToken = useRevokeMcpToken();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedMcpTokenDTO | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [endpointCopied, setEndpointCopied] = useState(false);

  const access = accessQuery.data;
  const tokens = access?.tokens ?? [];
  const endpoint = access?.endpoint ?? "";
  const exampleConfigs = access?.exampleConfigs;

  const submit = (): void => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    createToken.mutate(
      { name: trimmed },
      {
        onSuccess: (token) => {
          setName("");
          setCreated(token);
        }
      }
    );
  };

  const revokeTarget = tokens.find((token) => token.id === revokeId) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP access</CardTitle>
        <CardDescription>
          Personal access tokens let coding tools connect to CodeSense and read
          your repositories and scans. The token is shown once when created.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {accessQuery.error ? (
          <Alert variant="destructive">
            {getErrorMessage(accessQuery.error)}
          </Alert>
        ) : null}
        {createToken.error ? (
          <Alert variant="destructive">
            {getErrorMessage(createToken.error)}
          </Alert>
        ) : null}

        {endpoint ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Endpoint
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate border border-border bg-muted/40 px-2 py-1.5 text-xs">
                {endpoint}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ok = await copyText(endpoint);
                  if (ok) {
                    setEndpointCopied(true);
                    window.setTimeout(() => setEndpointCopied(false), 1500);
                  }
                }}
              >
                <Copy aria-hidden="true" />
                {endpointCopied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}

        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FormField
            id="mcp-token-name"
            label="Token name"
            className="flex-1"
            hint="A label for this machine or client, for example laptop."
          >
            <Input
              id="mcp-token-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="laptop"
              autoComplete="off"
            />
          </FormField>
          <Button type="submit" isLoading={createToken.isPending}>
            <Plus aria-hidden="true" />
            Create token
          </Button>
        </form>

        {tokens.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No MCP tokens yet"
            description="Create a token, then paste the generated client config into your MCP client."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="w-24"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>{token.name}</TableCell>
                  <TableCell>
                    <code className="text-xs">{token.prefix}…</code>
                  </TableCell>
                  <TableCell>{formatDateTime(token.createdAt)}</TableCell>
                  <TableCell>
                    {token.lastUsedAt
                      ? formatRelativeTime(token.lastUsedAt)
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeId(token.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {exampleConfigs ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Example client configs. Replace{" "}
              <code className="text-xs">&lt;token&gt;</code> with a token you
              create, or copy the ready-made config from the dialog after
              creating one.
            </p>
            <ConfigBlock title="Cursor mcp.json" value={exampleConfigs.cursor} />
            <ConfigBlock
              title="Claude Desktop"
              value={exampleConfigs.claudeDesktop}
            />
            <ConfigBlock title="VS Code" value={exampleConfigs.vscode} />
          </div>
        ) : null}
      </CardContent>

      <Dialog
        open={created !== null}
        onClose={() => setCreated(null)}
        title="Copy your MCP token"
        description="This token will not be shown again. Store it in your MCP client now."
        className="max-w-2xl"
        footer={
          <Button onClick={() => setCreated(null)}>Done</Button>
        }
      >
        {created ? (
          <div className="flex flex-col gap-3">
            <Alert variant="warning" title="Shown once">
              Treat this token like a password. Revoke it if it leaks.
            </Alert>
            <FormField id="mcp-created-token" label="Token">
              <div className="flex gap-2">
                <Input
                  id="mcp-created-token"
                  readOnly
                  value={created.token}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    void copyText(created.token);
                  }}
                >
                  <Copy aria-hidden="true" />
                  Copy
                </Button>
              </div>
            </FormField>
            {endpoint ? (
              <>
                <ConfigBlock
                  title="Cursor mcp.json"
                  value={createdConfigs(endpoint, created.token).cursor}
                />
                <ConfigBlock
                  title="Claude Desktop"
                  value={createdConfigs(endpoint, created.token).claudeDesktop}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke MCP token"
        description={
          revokeTarget
            ? `Clients using “${revokeTarget.name}” (${revokeTarget.prefix}…) will lose access immediately.`
            : "This token will be revoked."
        }
        confirmLabel="Revoke"
        destructive
        isConfirming={revokeToken.isPending}
        error={revokeToken.error ? getErrorMessage(revokeToken.error) : null}
        onConfirm={() => {
          if (!revokeTarget) {
            return;
          }
          revokeToken.mutate(revokeTarget.id, {
            onSuccess: () => setRevokeId(null)
          });
        }}
        onCancel={() => setRevokeId(null)}
      />
    </Card>
  );
}
