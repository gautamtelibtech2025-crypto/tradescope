from __future__ import annotations


class BackgroundAssistantService:
    def get_runtime_policy(self) -> dict[str, int]:
        return {
            "max_cpu_percent": 10,
            "max_memory_mb": 200,
            "suggestion_cooldown_seconds": 1800,
        }

