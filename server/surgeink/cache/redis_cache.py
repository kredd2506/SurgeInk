from __future__ import annotations

import json
import logging
from typing import Optional

import redis.asyncio as aioredis

from surgeink.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return _redis


async def cache_get(key: str) -> Optional[str]:
    try:
        r = await get_redis()
        return await r.get(key)
    except Exception:
        logger.debug("Redis cache miss (connection error) for key: %s", key)
        return None


async def cache_set(key: str, value: str, ttl_seconds: int = 3600) -> None:
    try:
        r = await get_redis()
        await r.set(key, value, ex=ttl_seconds)
    except Exception:
        logger.debug("Redis cache set failed for key: %s", key)


async def cache_get_json(key: str):
    raw = await cache_get(key)
    if raw is not None:
        return json.loads(raw)
    return None


async def cache_set_json(key: str, value, ttl_seconds: int = 3600) -> None:
    await cache_set(key, json.dumps(value), ttl_seconds)


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None
