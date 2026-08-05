import { Suspense } from "react";
import PosWorkspace from "../components/pos/pos-workspace";

export default function PosPage() {
  return (
    <Suspense fallback={null}>
      <PosWorkspace />
    </Suspense>
  );
}
