import os
import json
import base64
import urllib.parse
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC  


# Path to your music folder
music_dir = r'new'
songs = []

for filename in os.listdir(music_dir):
    if filename.lower().endswith('.mp3'):
        path = os.path.join(music_dir, filename)
        try:
            audio = MP3(path)
            tags = ID3(path)

            title = tags.get('TIT2', TIT2(encoding=3, text=filename)).text[0]
            artist = tags.get('TPE1', TPE1(encoding=3, text='Unknown Artist')).text[0]
            album = tags.get('TALB', TALB(encoding=3, text='Unknown Album')).text[0]
            duration = int(audio.info.length)

            # ✅ Encode the filename for web-safe use
            encoded_filename = urllib.parse.quote(filename)

            # Extract cover art if available
            cover_data = None
            for tag in tags.values():
                if isinstance(tag, APIC):
                    cover_data = (
                        f"data:{tag.mime};base64," +
                        base64.b64encode(tag.data).decode('utf-8')
                    )
                    break

            # Placeholder for mood and artist image
            mood = "unknown"
            artistImg = "https://example.com/default_artist.jpg"

            songs.append({
                'title': title,
                'artist': artist,
                'mood': mood,
                
                'album': album,
                # ✅ Use encoded filename in 'file' field
                'file': encoded_filename,
                'cover': cover_data,
                'artistImg': artistImg,
                'duration': duration
            })

        except Exception as e:
            songs.append({'file': filename, 'error': str(e)})

# Output JSON file
output_file = os.path.join(music_dir, 'songs_nnn.json')

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(songs, f, ensure_ascii=False, indent=2)

print(f"✅ Extracted {len(songs)} songs to {output_file}")
