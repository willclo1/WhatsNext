from datetime import datetime

from sqlalchemy import Boolean, Date, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from configSettings.database import Base

class Actors(Base):
    __tablename__ = "actors"

    actor_id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(255), nullable=False)