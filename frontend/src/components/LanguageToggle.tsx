import { Switch } from "@/components/ui/switch"
import { useTranslation } from "react-i18next"

export default function LanguageSwitch() {
  const { i18n } = useTranslation()

  const checked = i18n.language.startsWith("es")

  function onCheckedChange(nextChecked: boolean) {
    void i18n.changeLanguage(nextChecked ? "es" : "en")
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">EN</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="Switch language between English and Spanish"
        className="data-[state=checked]:bg-slate-400 data-[state=unchecked]:bg-zinc-700"
      />
      <span className="text-sm">ES</span>
    </div>
  )
}
