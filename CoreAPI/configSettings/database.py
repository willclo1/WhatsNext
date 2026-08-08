from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker

from configSettings.config import DATABASE_URL

engine = create_engine(

    DATABASE_URL,

    pool_size=20,

    max_overflow=10,

    pool_timeout=30,

    pool_recycle=3600,

    echo=False

)


SessionLocal = sessionmaker(

    bind=engine,

    autoflush=False,

    autocommit=False,

)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    pass
