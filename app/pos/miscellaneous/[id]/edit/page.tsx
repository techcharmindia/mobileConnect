"use client";

import { useParams } from "next/navigation";
import MiscellaneousFormPage from "../../../../components/pos/miscellaneous-form-page";

export default function EditMiscellaneousPage() {
  const params = useParams<{ id: string }>();
  return <MiscellaneousFormPage mode="edit" itemId={params.id} />;
}
