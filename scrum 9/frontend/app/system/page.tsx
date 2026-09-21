import { BackendStatus } from "@/components/backend-status";

export default function SystemStatus() {
  return <main className="mx-auto max-w-3xl p-8">
    <h1>Karlsgate system status</h1>
    <BackendStatus />
  </main>;
}
