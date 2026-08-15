from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from configSettings.database import Base

class Actors(Base):
    __tablename__ = "actors"

    actor_id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(255), nullable=False)

    # Populated from TMDB credits, which carry these alongside the billing
    # order, so they cost no extra API calls.
    profile_path = mapped_column(String(255))
    known_for_department = mapped_column(String(50))
    popularity = mapped_column(Float)

    # Scores used to pick game endpoints. See movieDBBuild/rebuild_cast.py.
    headline_count = mapped_column(Integer, default=0)
    costar_degree = mapped_column(Integer, default=0)
    is_terminus = mapped_column(Boolean, default=False)