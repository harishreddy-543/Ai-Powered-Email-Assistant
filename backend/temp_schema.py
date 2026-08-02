from pydantic import BaseModel
class SummaryRequest(BaseModel):
    bullet_count: int = 5
