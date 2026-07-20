import os
import shutil
import sqlite3
from pathlib import Path

# Running this file directly puts scripts/ on sys.path, not the project root, so
# `config.settings` (and every app) would be unimportable. Add the root explicitly
# so the script works from any working directory.
import sys
from pathlib import Path as _Path
sys.path.insert(0, str(_Path(__file__).resolve().parent.parent))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
from django.core.management import call_command

BASE_DIR = Path(__file__).resolve().parent
TARGET_DB = BASE_DIR / "db.sqlite3"
SOURCE_DB_CANDIDATES = [
    BASE_DIR / "test.db",
    BASE_DIR / "test.sqlite3",
    BASE_DIR / "data.sqlite3",
    Path(r"C:\Users\Murodulla\Downloads\test.db"),
]

def find_source_db() -> Path:
    for path in SOURCE_DB_CANDIDATES:
        if path.exists():
            target_path = BASE_DIR / path.name
            if path != target_path and not target_path.exists():
                shutil.copy2(path, target_path)
            return target_path if target_path.exists() else path
    raise FileNotFoundError(
        "Source database not found. Place your SQLite file as test.db in the project root."
    )


def get_table_names(conn: sqlite3.Connection):
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return {row[0] for row in rows}


def import_from_source(source_conn: sqlite3.Connection) -> int:
    from tests_app.models import Question, AnswerOption, TestSet
    from learning.models import Topic

    table_info = source_conn.execute("PRAGMA table_info(questions)").fetchall()
    columns = [row[1] for row in table_info]
    if not columns:
        return 0

    if all(col in columns for col in ["question", "option_a", "option_b", "option_c", "option_d", "correct_answer"]):
        query = "SELECT id, chapter, question, option_a, option_b, option_c, option_d, correct_answer FROM questions"
    else:
        query = "SELECT * FROM questions"

    rows = source_conn.execute(query).fetchall()
    if not rows:
        return 0

    topic, _ = Topic.objects.get_or_create(title="Import test", slug="import-test", category="history", order=99)
    created_test, _ = TestSet.objects.get_or_create(
        title="Imported Test",
        defaults={
            "description": "Imported from uploaded SQLite file",
            "category": "history",
            "duration_minutes": 15,
        },
    )

    processed = 0
    imported = 0
    for row in rows:
        if len(row) < 3:
            continue

        values = dict(zip(columns, row)) if len(columns) == len(row) else None
        if values is None:
            continue

        question_text = values.get("question") or values.get("question_text") or values.get("text")
        if not question_text:
            continue

        question, created = Question.objects.get_or_create(
            text=question_text,
            defaults={
                "topic": topic,
                "difficulty": "medium",
                "category": "history",
            },
        )
        processed += 1
        if created:
            imported += 1

        if not question.choices.exists():
            options = [
                values.get("option_a"),
                values.get("option_b"),
                values.get("option_c"),
                values.get("option_d"),
            ]
            correct_letter = str(values.get("correct_answer") or "").upper()
            for idx, option_text in enumerate(options, start=1):
                if option_text:
                    is_correct = False
                    if correct_letter == "A" and idx == 1:
                        is_correct = True
                    elif correct_letter == "B" and idx == 2:
                        is_correct = True
                    elif correct_letter == "C" and idx == 3:
                        is_correct = True
                    elif correct_letter == "D" and idx == 4:
                        is_correct = True

                    AnswerOption.objects.get_or_create(question=question, text=option_text, defaults={"is_correct": is_correct})

        question_title = f"Imported Test #{question.id}"
        chapter_name = values.get("chapter") or "General"
        test, test_created = TestSet.objects.get_or_create(
            title=question_title,
            defaults={
                "description": f"Imported from source DB — {chapter_name}",
                "category": "history",
                "duration_minutes": 10,
            },
        )
        if test_created:
            imported += 1
        test.questions.add(question)

    return processed, imported


def main() -> None:
    django.setup()
    call_command("migrate", run_syncdb=True, verbosity=0)

    source_db = find_source_db()
    print(f"Using source database: {source_db}")

    target_conn = sqlite3.connect(TARGET_DB)
    source_conn = sqlite3.connect(source_db)

    try:
        target_conn.execute("PRAGMA foreign_keys = OFF")
        target_conn.execute("BEGIN")

        processed_rows, total_imported = import_from_source(source_conn)
        target_conn.commit()
    finally:
        target_conn.execute("PRAGMA foreign_keys = ON")
        target_conn.close()
        source_conn.close()

    print(f"Finished. Processed {processed_rows} rows from source; created {total_imported} new questions.")


if __name__ == "__main__":
    main()
