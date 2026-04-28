import { Link } from "react-router-dom";
import type * as api from "@/lib/codepush-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  apps: api.AppRow[];
  newName: string;
  setNewName: (v: string) => void;
  onAdd: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onTransfer: (name: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
};

export function AppsManager({ apps, newName, setNewName, onAdd, onRename, onTransfer, onDelete }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tạo ứng dụng mới</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="Tên app" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button disabled={!newName.trim()} onClick={() => void onAdd()}>
            Thêm app
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách ứng dụng</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.name}>
                  <TableCell>
                    <Link className="text-primary hover:underline" to={`/app/${encodeURIComponent(app.name)}`}>
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => void onTransfer(app.name)}>
                        Transfer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void onRename(app.name)}>
                        Đổi tên
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void onDelete(app.name)}>
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
