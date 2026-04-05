"use client";

import EnablePushButton from "@/components/push/EnablePushButton";
import PushNotificationTestCard from "@/components/push/PushNotificationTestCard";
import { usePushCurrentMembreId } from "@/hooks/usePushCurrentMembreId";

export default function PushNotificationPanel() {
  const { membreId, loading } = usePushCurrentMembreId();

  return (
    <div className="mt-4 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm">
      <p className="text-base font-bold text-slate-900">Notifications ASF-NTOL</p>
      <p className="mt-1 text-sm text-slate-600">
        Activez les notifications sur cet appareil pour le PC et le téléphone.
      </p>

      <EnablePushButton />

      {!loading && membreId ? (
        <PushNotificationTestCard membreId={membreId} />
      ) : null}
    </div>
  );
}