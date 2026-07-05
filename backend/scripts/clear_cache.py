import shutil
from pathlib import Path

backend_dir = Path(__file__).parent.parent

# 1. Clear .cache directory
cache_dir = backend_dir / ".cache"
if cache_dir.exists():
    print(f"Clearing {cache_dir}...")
    shutil.rmtree(cache_dir)
else:
    print(".cache directory does not exist.")

# 2. Delete mergen_cache.db files
for f in ["mergen_cache.db", "mergen_cache.db-wal", "mergen_cache.db-shm"]:
    db_file = backend_dir / f
    if db_file.exists():
        print(f"Deleting {db_file}...")
        try:
            db_file.unlink()
        except Exception as e:
            print(f"Error deleting {db_file}: {e}")

# 3. Delete checkpoints.db files
for f in ["checkpoints.db", "checkpoints.db-wal", "checkpoints.db-shm"]:
    db_file = backend_dir / f
    if db_file.exists():
        print(f"Deleting {db_file}...")
        try:
            db_file.unlink()
        except Exception as e:
            print(f"Error deleting {db_file}: {e}")

print("Cache cleared successfully!")
