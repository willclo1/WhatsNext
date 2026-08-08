from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from configSettings.database import Base
class Movie(Base):

    __tablename__ = "movies"

    tmdb_id = mapped_column(Integer, primary_key=True)

    title = mapped_column(String(500), nullable=False)

    original_title = mapped_column(String(500))

    overview = mapped_column(Text)

    release_date = mapped_column(Date)

    original_language = mapped_column(String(10))

    poster_path = mapped_column(String(255))

    backdrop_path = mapped_column(String(255))

    popularity = mapped_column(Float)

    vote_average = mapped_column(Float)

    vote_count = mapped_column(Integer)

    adult = mapped_column(Boolean)

    updated_at = mapped_column(DateTime)
