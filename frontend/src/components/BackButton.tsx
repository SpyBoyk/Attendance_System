import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const navigate = useNavigate();
  return (
    <Button size="sm" onClick={() => navigate(-1)}>
      <ArrowLeft className="size-3.5" />
      Back
    </Button>
  );
}
