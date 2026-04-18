"""HP / damage formulas per SRS Section 10.1.

Owner: Track-4 (Backend-Game). Implementation below matches the spec exactly
and is ready to use as-is; adjust only if the spec is revised.
"""

from ..enums import Difficulty

BASE_DAMAGE = 10

DIFFICULTY_MULTIPLIER: dict[Difficulty, float] = {
    Difficulty.EASY: 0.5,
    Difficulty.MEDIUM: 1.0,
    Difficulty.HARD: 1.5,
}


def compute_damage(
    is_correct: bool,
    difficulty: Difficulty,
    partial_credit: float,
) -> tuple[int, int]:
    """Return (damage_to_monster, damage_to_user)."""
    base = BASE_DAMAGE * DIFFICULTY_MULTIPLIER[difficulty]
    if is_correct:
        return (int(base), 0)
    if partial_credit >= 0.5:
        return (int(base * partial_credit), int(base * (1 - partial_credit)))
    return (0, int(base))
