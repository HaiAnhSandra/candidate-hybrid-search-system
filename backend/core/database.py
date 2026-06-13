from typing import AsyncGenerator

from pgvector.asyncpg import register_vector
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from core.config import settings


Base = declarative_base()

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@event.listens_for(engine.sync_engine, "connect")
def _register_vector(dbapi_connection, _connection_record) -> None:
    dbapi_connection.run_async(lambda connection: register_vector(connection))


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session