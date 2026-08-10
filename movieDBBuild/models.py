from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
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

    cast = relationship("MovieCast", back_populates="movie")


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

    movie = relationship("Movie", back_populates="cast")

    actor = relationship("Actors", back_populates="cast")



class Actors(Base):
    __tablename__ = "actors"

    actor_id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(255), nullable=False)

    cast = relationship("MovieCast", back_populates="actor")