"""Extract complete, caption-free artwork with padding; preserve source files."""
import json
import struct
import zlib
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public/jelly_vocabulary_assets'


def read_png(path):
    source = path.read_bytes()
    offset, compressed = 8, bytearray()
    while offset < len(source):
        size = struct.unpack('>I', source[offset:offset + 4])[0]
        kind, data = source[offset + 4:offset + 8], source[offset + 8:offset + 8 + size]
        offset += size + 12
        if kind == b'IHDR':
            width, height, depth, mode, compression, filtering, interlace = struct.unpack('>IIBBBBB', data)
            assert depth == 8 and mode in (2, 6) and not interlace
        elif kind == b'IDAT':
            compressed.extend(data)
    channels = 3 if mode == 2 else 4
    stride, raw = width * channels, zlib.decompress(compressed)
    rows, previous = [], bytearray(width * channels)
    for y in range(height):
        filter_type = raw[y * (stride + 1)]
        row = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            left = row[i - channels] if i >= channels else 0
            above = previous[i]
            corner = previous[i - channels] if i >= channels else 0
            if filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = above
            elif filter_type == 3:
                predictor = (left + above) // 2
            elif filter_type == 4:
                p = left + above - corner
                distances = [abs(p - left), abs(p - above), abs(p - corner)]
                predictor = [left, above, corner][distances.index(min(distances))]
            else:
                assert filter_type == 0
                predictor = 0
            row[i] = (row[i] + predictor) & 255
        rows.append(row)
        previous = row
    return width, height, channels, rows


def write_png(path, side, pixels):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    rows = b''.join(b'\0' + pixels[y * side * 4:(y + 1) * side * 4] for y in range(side))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', side, side, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b''))


def prepare():
    width, height, channels, rows = read_png(ASSETS / 'original_reference_sheet.png')
    entries = json.loads((ROOT / 'data/vocabulary-frames.json').read_text())
    for item in entries:
        side = max(*item['color'][2:], *item['outline'][2:]) + 32
        for variant, folder in [('color', 'color'), ('outline', 'black_and_white')]:
            x, y, w, h = item[variant]
            assert 0 <= x < x + w <= width and 0 <= y < y + h <= height
            pixels = bytearray([255]) * (side * side * 4)
            left, top = (side - w) // 2, (side - h) // 2
            for dy in range(h):
                for dx in range(w):
                    start = (x + dx) * channels
                    dest = ((top + dy) * side + left + dx) * 4
                    pixels[dest:dest + 3] = rows[y + dy][start:start + 3]
            if variant == 'color':
                seen, queue = set(), deque()
                def visit(index):
                    if index in seen:
                        return
                    seen.add(index)
                    rgb = pixels[index * 4:index * 4 + 3]
                    if min(rgb) >= 235 and max(rgb) - min(rgb) <= 20:
                        queue.append(index)
                for i in range(side):
                    visit(i)
                    visit((side - 1) * side + i)
                    visit(i * side)
                    visit(i * side + side - 1)
                while queue:
                    index = queue.popleft()
                    pixels[index * 4 + 3] = 0
                    px, py = index % side, index // side
                    for nx, ny in [(px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)]:
                        if 0 <= nx < side and 0 <= ny < side:
                            visit(ny * side + nx)
            write_png(ASSETS / 'prepared' / folder / f"level_{item['level']}" / f"{item['name']}.png", side, pixels)
    print(f'Prepared {len(entries) * 2} complete, padded vocabulary images.')


if __name__ == '__main__':
    prepare()
