"""Points, streak, lives logic per SRS Section 10.3-10.4 and FR-PTS.

Owner: Track-4 (Backend-Game).
"""

from ..enums import BattleOutcome, BattleType

BASE_POINTS: dict[BattleType, int] = {
    BattleType.REGULAR: 100,
    BattleType.MIDTERM: 500,
    BattleType.FINAL: 2000,
}

STREAK_MULTIPLIER_CAP = 3.0
STREAK_PER_STEP = 0.1


def compute_points(outcome: BattleOutcome, battle_type: BattleType, streak: int) -> int:
    if outcome != BattleOutcome.WIN:
        return 0
    multiplier = min(1.0 + (streak * STREAK_PER_STEP), STREAK_MULTIPLIER_CAP)
    return int(BASE_POINTS[battle_type] * multiplier)


def hp_preset(battle_type: BattleType) -> tuple[int, int]:
    """Return (user_hp, monster_hp) per SRS 10.2."""
    if battle_type == BattleType.MIDTERM:
        return (50, 300)
    if battle_type == BattleType.FINAL:
        return (100, 500)
    return (30, 100)
