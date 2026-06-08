from typing import Literal

from pydantic import BaseModel, Field


class PlannedTask(BaseModel):
    heading: str = Field(
        min_length=1,
        max_length=160,
        description="A concise, actionable task title",
    )
    description: str = Field(
        min_length=1,
        max_length=2000,
        description="Clear completion criteria and useful context",
    )
    assignee_email: str | None = Field(
        default=None,
        description="Email of the best workspace member for this task, or null",
    )
    priority: Literal["low", "medium", "high"] = "medium"


class TaskPlan(BaseModel):
    summary: str = Field(
        max_length=1000,
        description="Short explanation of the proposed plan",
    )
    tasks: list[PlannedTask] = Field(
        min_length=1,
        max_length=20,
        description="Tasks needed to complete the request",
    )
