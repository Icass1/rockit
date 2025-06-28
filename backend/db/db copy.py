from sqlalchemy import ForeignKey, create_engine, Table, Column, Integer, Date, Boolean, String, MetaData, select

engine = create_engine("sqlite:///database.db")
metadata = MetaData()

conn = engine.connect()

artists = Table(
    "artists", metadata,
    Column("id", String, primary_key=True),
    Column("name", String, ForeignKey("us.asdf")),
    Column("followers", Integer),
)

artists.create(conn, checkfirst=True)

# with engine.connect() as conn:
#     stmt = select(artists).where(artists.c.id == "artist_id")
#     result = conn.execute(stmt).fetchone()
#     if result:
#         print(result.name)
