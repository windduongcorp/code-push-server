import type * as api from "@/lib/codepush-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SessionsManager({
  sessions,
  onRemove,
}: {
  sessions: api.SessionInfo[];
  onRemove: (machine: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quản lý session</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Logged in</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.machineName}>
                <TableCell>{s.machineName}</TableCell>
                <TableCell>{s.loggedInTime ? new Date(s.loggedInTime).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" onClick={() => void onRemove(s.machineName)}>
                    Remove
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
