import { CalendarCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectGoogleCalendar } from "../actions";

export function ConnectGoogleButton() {
  return (
    <form action={connectGoogleCalendar}>
      <Button type="submit">
        <CalendarCheckIcon data-icon="inline-start" />
        Připojit Google kalendář
      </Button>
    </form>
  );
}
