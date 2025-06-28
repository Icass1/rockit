from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, select
from sqlalchemy.orm import declarative_base, relationship, Session

Base = declarative_base()

# Define ORM models


class User(Base):
    __tablename__ = 'user_account'
    id = Column(Integer, primary_key=True)
    name = Column(String)

    # One-to-many relationship
    addresses = relationship("Address", back_populates="user")


class Address(Base):
    __tablename__ = 'address'
    id = Column(Integer, primary_key=True)
    email_address = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('user_account.id'))

    # Backref to user
    user = relationship("User", back_populates="addresses")


# In-memory SQLite DB
engine = create_engine("sqlite:///database.db", echo=True)
Base.metadata.create_all(engine)

# Insert test data
with Session(engine) as session:
    user = User(name="Alice")
    user.addresses = [
        Address(email_address="alice@example.com"),
        Address(email_address="alice@work.com")
    ]
    session.add(user)
    session.commit()

# Query using join_from (demonstrates auto-ON detection from ForeignKey)
with Session(engine) as session:
    stmt = select(Address.email_address).join_from(User, Address)
    results = session.execute(stmt).all()
    for row in results:
        print(row)
