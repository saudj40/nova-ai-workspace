from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: str = Field(min_length=1)


class ChatResponse(BaseModel):
    response: str


class DemoContextItem(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=80,
    )
    excerpt: str = Field(
        min_length=1,
        max_length=800,
    )


class DemoChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=2000,
    )
    context: list[DemoContextItem] = Field(
        default_factory=list,
        max_length=3,
    )
