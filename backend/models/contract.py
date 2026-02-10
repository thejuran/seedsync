from sqlalchemy import Column, Integer, String, Boolean, Enum as SAEnum, DateTime
from sqlalchemy.orm import relationship
from backend.db.database import Base
import enum
from datetime import datetime

class PurchaseType(str, enum.Enum):
    RESALE = "resale"
    DIRECT = "direct"

class UseYearMonth(int, enum.Enum):
    FEBRUARY = 2
    MARCH = 3
    APRIL = 4
    JUNE = 6
    AUGUST = 8
    SEPTEMBER = 9
    OCTOBER = 10
    DECEMBER = 12

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=True)  # optional friendly name like "Our Poly contract"
    home_resort = Column(String, nullable=False)  # resort slug/key e.g. "polynesian"
    use_year_month = Column(Integer, nullable=False)  # 2,3,4,6,8,9,10,12
    annual_points = Column(Integer, nullable=False)
    purchase_type = Column(String, nullable=False, default=PurchaseType.RESALE.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    point_balances = relationship("PointBalance", back_populates="contract", cascade="all, delete-orphan")
