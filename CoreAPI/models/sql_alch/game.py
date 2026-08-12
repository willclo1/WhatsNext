from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from configSettings.database import Base

class Game(Base):

    __tablename__ = "games"

    id = mapped_column(Integer, primary_key=True)

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

