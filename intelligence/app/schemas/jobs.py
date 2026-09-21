from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    company_id: int
    status: str
    result: dict | None
    error: str | None
    callback_url: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
