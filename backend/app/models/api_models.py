"""Typed response models for the read-only data API (the frontend mirrors these)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class FloatSummary(BaseModel):
    platform_number: str
    latitude: float | None = None
    longitude: float | None = None
    float_type: str | None = None
    n_cycles: int | None = None
    is_active: bool | None = None
    last_cycle_at: datetime | None = None
    deploy_date: datetime | None = None


class FloatList(BaseModel):
    items: list[FloatSummary]
    total: int


class Cycle(BaseModel):
    cycle_number: int
    juld: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
    max_pres: float | None = None
    data_mode: str | None = None


class FloatDetail(BaseModel):
    float: dict[str, Any]
    cycles: list[Cycle]


class TrajectoryPoint(BaseModel):
    cycle_number: int | None = None
    ts: datetime
    latitude: float | None = None
    longitude: float | None = None


class KnowledgeDoc(BaseModel):
    id: int
    source: str | None = None
    title: str
    content: str
    score: float | None = None


class OverviewStats(BaseModel):
    floats: int
    profiles: int
    bgc_floats: int
    knowledge_docs: int
    parquet_profiles: int
    latest_cycle: datetime | None = None


class SqlRunRequest(BaseModel):
    sql: str


class SqlRunResult(BaseModel):
    sql: str
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool
