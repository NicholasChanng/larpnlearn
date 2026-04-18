from enum import Enum


class Theme(str, Enum):
    MARIO = "mario"
    POKEMON = "pokemon"
    GREEK = "greek"


class LevelState(str, Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    COMPLETED = "completed"


class QuestionType(str, Enum):
    MCQ = "mcq"
    SPOKEN = "spoken"
    PSEUDOCODE = "pseudocode"
    MATH = "math"
    SHORT_ANSWER = "short_answer"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SkillState(str, Enum):
    LOCKED = "locked"
    ATTEMPTED = "attempted"
    MASTERED = "mastered"


class BattleOutcome(str, Enum):
    WIN = "win"
    LOSE = "lose"
    ABANDONED = "abandoned"


class ExamType(str, Enum):
    MIDTERM = "midterm"
    FINAL = "final"


class DocType(str, Enum):
    COURSE_OVERVIEW = "course_overview"
    SYLLABUS_SECTION = "syllabus_section"
    SCHEDULE_ENTRY = "schedule_entry"
    LECTURE_OVERVIEW = "lecture_overview"
    LECTURE_SLIDE_CHUNK = "lecture_slide_chunk"
    CONCEPT_DEFINITION = "concept_definition"
    CONCEPT_RELATIONSHIP = "concept_relationship"
    EXAM_DESCRIPTION = "exam_description"
    WORKED_EXAMPLE = "worked_example"


class BattleType(str, Enum):
    REGULAR = "regular"
    MIDTERM = "midterm"
    FINAL = "final"
