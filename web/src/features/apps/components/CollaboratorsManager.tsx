import type * as api from "@/lib/codepush-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  apps: api.AppRow[];
  selectedApp: string;
  collaborators: api.CollaboratorMap;
  email: string;
  setSelectedApp: (v: string) => void;
  setEmail: (v: string) => void;
  onAdd: () => Promise<void>;
  onRemove: (email: string) => Promise<void>;
};

export function CollaboratorsManager({
  apps,
  selectedApp,
  collaborators,
  email,
  setSelectedApp,
  setEmail,
  onAdd,
  onRemove,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quản lý collaborator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[240px_1fr_auto]">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}>
            {apps.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <Input placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button disabled={!email.trim() || !selectedApp} onClick={() => void onAdd()}>
            Thêm
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(collaborators).map(([mail, info]) => (
              <TableRow key={mail}>
                <TableCell>{mail}</TableCell>
                <TableCell>{info.permission ?? "Collaborator"}{info.isCurrentAccount ? " (you)" : ""}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" onClick={() => void onRemove(mail)}>
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
