from enum import IntEnum, StrEnum


class SeniorityLevel(IntEnum):
    FRESHER = 0
    JUNIOR = 1
    MID = 2
    SENIOR = 3
    LEAD = 4
    EXPERT = 5


class DegreeLevel(IntEnum):
    NONE = 0
    ASSOCIATE = 1
    BACHELOR = 2
    MASTER = 3
    PHD = 4


class AvailabilityStatus(StrEnum):
    AVAILABLE = "available"
    OPEN = "open"
    CLOSED = "closed"
