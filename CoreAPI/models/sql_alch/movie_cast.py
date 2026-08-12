from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from configSettings.database import Base

class MovieCast(Base):
    __tablename__ = "movie_cast"

    movie_id = mapped_column(

        Integer,

        ForeignKey("movies.tmdb_id"),

        primary_key=True

    )

    actor_id = mapped_column(

        Integer,

        ForeignKey("actors.actor_id"),

        primary_key=True

    )

    character = mapped_column(String(500))

    cast_order = mapped_column(Integer)
