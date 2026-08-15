from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import text

from configSettings.database import Base

class Game(Base):

    __tablename__ = "games"

    id = mapped_column(Integer, primary_key=True)

    # Issued at creation and required for every state-changing call. See
    # schema.sql for why sequential ids alone were not enough.
    token = mapped_column(UUID(as_uuid=True), server_default=text("gen_random_uuid()"))

    start_actor_id = mapped_column(
        Integer,
        ForeignKey("actors.actor_id"),
        nullable=False,
    )

    target_actor_id = mapped_column(
        Integer,
        ForeignKey("actors.actor_id"),
        nullable=False,
    )

    current_actor_id = mapped_column(
        Integer,
        ForeignKey("actors.actor_id"),
        nullable=False,
    )

    # "in_progress" | "won" | "abandoned"
    status = mapped_column(String(20), nullable=False, default="in_progress")

    created_at = mapped_column(DateTime, default=datetime.utcnow)

