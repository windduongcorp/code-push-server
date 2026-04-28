import type * as api from "@/lib/codepush-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  accessKeys: api.AccessKeyInfo[];
  newName: string;
  ttlDays: string;
  createdAccessKey: api.CreatedAccessKey | null;
  setNewName: (v: string) => void;
  setTtlDays: (v: string) => void;
  onCreate: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onRotate: (name: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  onCopyCreated: () => Promise<void>;
  onDismissCreated: () => void;
};

export function AccessKeysManager(props: Props) {
  const {
    accessKeys,
    newName,
    ttlDays,
    createdAccessKey,
    setNewName,
    setTtlDays,
    onCreate,
    onRename,
    onRotate,
    onDelete,
    onCopyCreated,
    onDismissCreated,
  } = props;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tạo access key</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Input placeholder="Tên key (ví dụ: ci-prod)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="TTL (ngày)" value={ttlDays} onChange={(e) => setTtlDays(e.target.value)} />
          <Button disabled={!newName.trim()} onClick={() => void onCreate()}>
            Tạo
          </Button>
        </CardContent>
      </Card>

      {createdAccessKey?.key ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Access key mới tạo (chỉ hiển thị một lần)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <code className="block break-all rounded-md bg-muted p-3 text-xs">{createdAccessKey.key}</code>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => void onCopyCreated()}>
                Copy
              </Button>
              <Button onClick={onDismissCreated}>Đã lưu xong</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách access key</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên key</TableHead>
                <TableHead>Tạo lúc</TableHead>
                <TableHead>Hết hạn</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessKeys.map((k, i) => {
                const keyName = k.friendlyName || k.name || `key-${i}`;
                return (
                  <TableRow key={`${keyName}-${i}`}>
                    <TableCell>{keyName}</TableCell>
                    <TableCell>{k.createdTime ? new Date(k.createdTime).toLocaleString() : "—"}</TableCell>
                    <TableCell>{k.expires ? new Date(k.expires).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => void onRename(keyName)}>
                          Đổi tên
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void onRotate(keyName)}>
                          Rotate
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void onDelete(keyName)}>
                          Xóa
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
