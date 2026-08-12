from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from configSettings.database import Base


class GameStep(Base):

    __tablename__ = "game_steps"

    id = mapped_column(Integer, primary_key=True)

    game_id = mapped_column(
        Integer,
        ForeignKey("games.id"),
        nullable=False,
    )

    step_number = mapped_column(Integer, nullable=False)

    actor_id = mapped_column(
        Integer,
        ForeignKey("actors.actor_id"),
        nullable=False,
    )

    movie_id = mapped_column(
        Integer,
        ForeignKey("movies.tmdb_id"),
        nullable=False,
    )

    created_at = mapped_column(DateTime, default=datetime.utcnow)