import type * as api from "@/lib/codepush-api";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/dialog";

type Props = {
  createdAccessKey: api.CreatedAccessKey | null;
  onCopyCreated: () => Promise<void>;
  onDismissCreated: () => void;
};

export function AccessKeyCreatedDialog({
  createdAccessKey,
  onCopyCreated,
  onDismissCreated,
}: Props) {
  if (!createdAccessKey?.key) return null;

  return (
    <AppDialog
      open={Boolean(createdAccessKey.key)}
      onOpenChange={(open) => {
        if (!open) onDismissCreated();
      }}
      title="Access key mới tạo (chỉ hiển thị một lần)"
      bodyClassName="space-y-3"
      actions={
        <>
          <Button variant="outline" onClick={() => void onCopyCreated()}>
            Copy
          </Button>
          <Button onClick={onDismissCreated}>Đã lưu xong</Button>
        </>
      }
    >
      <code className="block break-all rounded-md bg-muted p-3 text-xs">
        {createdAccessKey.key}
      </code>
    </AppDialog>
  );
}
