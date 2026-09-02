import json
import re

REMOVE_PATTERNS = [
    r"-SenSongsMp3\.Co",
    r"\(www\.SenSongsMp3\.co\)",
    r"- Pagalworld\.org",
    r":: SenSongsMp3\.Co",
    r"-My3Songs\.In",
    r"- PagalNew",
    r"^\[iSongs\.info\]\s*",
    r"^\d{2}\s*-\s*"
]

def clean_title(title):
    for pat in REMOVE_PATTERNS:
        title = re.sub(pat, "", title, flags=re.IGNORECASE).strip()
    return title


# Clean songs_nnn.json and write to songs_nnn_cleaned.json
with open("new\\songs_nnn.json", encoding="utf-8") as f:
    data = json.load(f)
    songs = data.get("songs", []) if isinstance(data, dict) else data
    for song in songs:
        if "title" in song:
            original = song["title"]
            cleaned = clean_title(original)
            print(f"Before: {original} | After: {cleaned}")
            song["title"] = cleaned

# Write cleaned data to songs_nnn_cleaned.json
with open("songs_nnnn.json", "w", encoding="utf-8") as f:
    if isinstance(data, dict):
        data["songs"] = songs
        json.dump(data, f, ensure_ascii=False, indent=2)
    else:
        json.dump(songs, f, ensure_ascii=False, indent=2)