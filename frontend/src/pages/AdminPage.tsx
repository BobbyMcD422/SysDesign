import { useTranslation } from "react-i18next";

export default function AdminPage() {
  const { t } = useTranslation()
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {t("dashboard.subtitle")}
      </p>
    </div>
  );
}