from __future__ import annotations


class SuggestionEngine:
    def get_suggestions(self, context: dict) -> list[str]:
        suggestions: list[str] = []
        battery = context.get("battery_percent")
        continuous_work_minutes = context.get("continuous_work_minutes", 0)

        if isinstance(battery, int) and battery <= 20:
            suggestions.append("Battery low hai, charger connect kar lo.")
        if continuous_work_minutes >= 180:
            suggestions.append("Aap 3 ghante se kaam kar rahe ho, 5 minute ka break le lo.")
        if context.get("late_night") is True:
            suggestions.append("Aaj ka schedule complete ho gaya hai, sone ka time consider karo.")

        return suggestions

