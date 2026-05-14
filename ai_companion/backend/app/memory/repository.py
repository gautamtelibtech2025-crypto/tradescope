from __future__ import annotations

from typing import Any

import asyncpg

from app.models.schemas import MemoryItem


class MemoryRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self.pool = await asyncpg.create_pool(self.database_url, min_size=1, max_size=4)

    async def disconnect(self) -> None:
        if self.pool is not None:
            await self.pool.close()

    async def write_memory(self, item: MemoryItem) -> None:
        if self.pool is None:
            return
        query = """
        insert into memory_items(user_id, key, value, category)
        values($1, $2, $3, $4)
        """
        await self.pool.execute(query, item.user_id, item.key, item.value, item.category)

    async def get_recent_context(self, user_id: str, limit: int = 8) -> list[dict[str, Any]]:
        if self.pool is None:
            return []
        query = """
        select key, value, category, created_at
        from memory_items
        where user_id = $1
        order by created_at desc
        limit $2
        """
        rows = await self.pool.fetch(query, user_id, limit)
        return [dict(row) for row in rows]

