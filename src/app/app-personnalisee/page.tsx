import AppInstallBanner from "@/components/app/AppInstallBanner";

export default function AppPersonnaliseePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
                Application personnalisée ASF-NTOL
              </h1>
              <p className="mt-2 text-sm text-emerald-900/70 md:text-base">
                Base applicative personnalisée de la plateforme : identité, installation, branding et expérience mobile/desktop.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
              Base installable
            </div>
          </div>
        </section>

        <AppInstallBanner />

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-emerald-950">Ce qui est prêt</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>• identité applicative ASF-NTOL</p>
              <p>• manifest installable</p>
              <p>• icônes d’application</p>
              <p>• base d’expérience mobile + desktop</p>
              <p>• point d’entrée pour la personnalisation</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-emerald-950">Étape suivante recommandée</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>• intégrer un écran d’accueil applicatif</p>
              <p>• personnaliser navigation, logo et identité visuelle</p>
              <p>• ajouter mode installation guidée</p>
              <p>• préparer le mode PWA avancé</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
