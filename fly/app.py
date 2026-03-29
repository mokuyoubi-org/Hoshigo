# hoshigo-goserver/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
import subprocess
import tempfile
import os
import requests
import re
import sgfmill.sgf
import sgfmill.sgf_moves
from goscorer import EMPTY, BLACK, WHITE, final_territory_score

app = Flask(__name__)
CORS(app)

# ------------------------------------------------------------------ #
# 設定
# ------------------------------------------------------------------ #
SUPABASE_PROJECT_URL = os.environ.get("SUPABASE_PROJECT_URL")
if not SUPABASE_PROJECT_URL:
    raise RuntimeError("SUPABASE_PROJECT_URL is not set")

SECRET_KEY = os.environ.get("SECRET_KEY")

GO_ENGINES = {
    # 1. うどん
    "gnugo": ["gnugo", "--mode", "gtp"], 
    # 2. くるみ
    "pachi": [
        "pachi",
        "-t", "=5000,threads=1",  # カンマでつなぐ
        "--nojoseki",
    ],
    # 3. せな
    "katago-b6c96": [
        "./katago", "gtp",
        "-config", "default_gtp.cfg",
        "-model", "kata1-b6c96-s175395328-d26788732.txt",
        "-override-config", "maxVisits=1,rules=japanese",
    ],
    # 4. るな
    "leela": [
        "leela",
        "--gtp",
        "--noponder",
        "--nobook",      # 布石ライブラリ読み込みをスキップ
        "--threads", "1",
        "--playouts", "3000",  # --noponderと併用必須
    ],
    # 5. うさぎせんせい
    "katago-b10c128": [ 
        "./katago", "gtp",
        "-config", "default_gtp.cfg",
        "-model", "kata1-b10c128-s1141046784-d204142634.txt",
        "-override-config", "maxVisits=1,rules=japanese",
    ],
}

# ------------------------------------------------------------------ #
# 認証デコレータ
# ------------------------------------------------------------------ #
def require_secret(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or auth_header != f"Bearer {SECRET_KEY}":
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ------------------------------------------------------------------ #
# GTP実行
# ------------------------------------------------------------------ #
def run_gtp(sgf_content: str, commands: str, engine: str = "gnugo") -> str:
    cmd = GO_ENGINES.get(engine)
    if not cmd:
        raise Exception(f"Unknown engine: {engine}")

    size_match = re.search(r'SZ\[(\d+)\]', sgf_content)
    board_size = int(size_match.group(1)) if size_match else 19

    sgf_file = None
    try:
        # pachiはloadsgf非対応なのでplayコマンドで棋譜を再現
        if engine == "pachi":
            sgf_game = sgfmill.sgf.Sgf_game.from_string(sgf_content)
            _, plays = sgfmill.sgf_moves.get_setup_and_moves(sgf_game)
            
            letters_gtp = "ABCDEFGHJKLMNOPQRST"  # Iをスキップ
            
            play_cmds = [f"boardsize {board_size}"]
            for colour, move in plays:
                colour_gtp = "black" if colour == "b" else "white"
                if move is None:
                    play_cmds.append(f"play {colour_gtp} pass")
                else:
                    row, col = move  # sgfmillはrow=下から, col=左から
                    gtp_col = letters_gtp[col]
                    gtp_row = row + 1
                    play_cmds.append(f"play {colour_gtp} {gtp_col}{gtp_row}")
            
            gtp_input = "\n".join(play_cmds) + f"\n{commands}\nquit\n"
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".sgf", mode='w') as f:
                f.write(sgf_content)
                sgf_file = f.name
            gtp_input = f"boardsize {board_size}\nloadsgf {sgf_file}\n{commands}\nquit\n"

        gtp = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        out, err = gtp.communicate(gtp_input, timeout=30)
        if err:
            print(f"GTP stderr: {err}", flush=True)
        print(f"GTP stdout: {out}", flush=True)
        return out

    except subprocess.TimeoutExpired:
        gtp.kill()
        raise Exception("GTP command timeout")
    finally:
        if sgf_file and os.path.exists(sgf_file):
            os.remove(sgf_file)

# ------------------------------------------------------------------ #
# SGFユーティリティ
# ------------------------------------------------------------------ #
def parse_sgf(sgf: str):
    """SGFをパースしてboard, plays, komiを返す"""
    sgf_game = sgfmill.sgf.Sgf_game.from_string(sgf)
    board, plays = sgfmill.sgf_moves.get_setup_and_moves(sgf_game)
    root = sgf_game.get_root()
    komi = float(root.get("KM")) if root.has_property("KM") else 6.5
    print(f"parse_sgf: board.side={board.side}, plays={plays}, komi={komi}", flush=True)
    return board, plays, komi

def last_move_was_pass(plays: list) -> bool:
    if not plays:
        return False
    entry = plays[-1]
    # playsの各要素は (colour, move) のタプル。moveがNoneならパス。
    colour, move = entry[0], entry[1]
    return move is None

def build_stones(board) -> list:
    size = board.side
    stones = []
    for row in range(size):
        stones_row = []
        for col in range(size):
            color = board.get(row, col)
            if color == "b":
                stones_row.append(BLACK)
            elif color == "w":
                stones_row.append(WHITE)
            else:
                stones_row.append(EMPTY)
        stones.append(stones_row)
    return stones

def gtp_to_rowcol(gtp: str, size: int) -> tuple:
    col = ord(gtp[0]) - ord('A')
    if col >= 8:  # Iをスキップ
        col -= 1
    row = int(gtp[1:]) - 1
    return row, col

def gtp_to_int(gtp: str, size: int) -> int:
    if gtp.upper() == "PASS":
        return -1
    col = ord(gtp[0]) - ord('A')
    if col >= 8:  # Iをスキップ
        col -= 1
    row = int(gtp[1:]) - 1
    return row * size + col

def rowcol_to_gtp(row: int, col: int, size: int) -> str:
    letters = "ABCDEFGHJKLMNOPQRST"
    return f"{letters[col]}{row + 1}"

def int_to_gtp(move_int: int, size: int) -> str:
    if move_int == -1:
        return "PASS"
    row = move_int // size
    col = move_int % size
    return rowcol_to_gtp(row, col, size)

def moves_to_sgf(moves: list, match_type: int, size: int = 9) -> str:
    """smallint[]をSGF文字列に変換"""
    handicap_map = {0: 0, 1: 0, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9}
    komi_map    = {0: 6.5, 1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0, 5: 0.0, 6: 0.0, 7: 0.0, 8: 0.0, 9: 0.0}

    handicap = handicap_map.get(match_type, 0)
    komi     = komi_map.get(match_type, 6.5)

    letters = "abcdefghijklmnopqrs"  # SGF用（Iあり）

    def to_sgf_coord(move_int: int) -> str:
        if move_int == -1:
            return ""
        row = move_int // size
        col = move_int % size
        return f"{letters[col]}{letters[size - 1 - row]}"

    sgf = f"(;GM[1]FF[4]SZ[{size}]KM[{komi}]"

    if handicap >= 2:
        handicap_positions = {
            9: {
                2: ["cc", "gg"],                   # 2子局
                3: ["cc", "cg", "gg"],             # 3子局
                4: ["cc", "gc", "cg", "gg"],       # 4子局
                5: ["cc", "gc", "ee", "cg", "gg"], # 5子局
            }
        }
        positions = handicap_positions.get(size, {}).get(handicap, [])
        if positions:
            sgf += f"HA[{handicap}]" + "".join(f"AB[{p}]" for p in positions)

    colors = ["W", "B"] if handicap >= 2 else ["B", "W"]

    # movesがNoneや空でも安全に処理
    for i, move_int in enumerate(moves or []):
        color = colors[i % 2]
        coord = to_sgf_coord(move_int)
        sgf += f";{color}[{coord}]"

    sgf += ")"
    print(f"moves_to_sgf: moves={moves}, match_type={match_type} -> {sgf}", flush=True)
    return sgf

# ------------------------------------------------------------------ #
# スコア計算
# ------------------------------------------------------------------ #
def calc_score(sgf: str) -> tuple:
    out = run_gtp(sgf, "final_status_list dead\ncaptures black\ncaptures white", "gnugo")

    # 全ての = 行を取得
    all_matches = re.findall(r'^=[ \t]*(.*)$', out, re.MULTILINE)

    # 死に石（複数行対応）
    dead_match = re.search(r'^=[ \t]*([A-Z].*?)(?=^=|\Z)', out, re.MULTILINE | re.DOTALL)
    dead_stones_gtp = dead_match.group(1).strip().split() if dead_match else []
    filtered = [s for s in dead_stones_gtp if re.match(r"^[A-Z]\d+$", s)]
    print(f"dead_stones_gtp: {filtered}", flush=True)

    # アゲハマ
    all_matches = re.findall(r'^=[ \t]*(.*)$', out, re.MULTILINE)
    number_matches = [m for m in all_matches if re.match(r'^\d+$', m.strip())]
    black_captures = int(number_matches[0]) if len(number_matches) > 0 else 0
    white_captures = int(number_matches[1]) if len(number_matches) > 1 else 0
  

    board, plays, komi = parse_sgf(sgf)
    size = board.side

    # playsをboardに適用して最終盤面を得る
    for colour, move in plays:
        if move is not None:
            row, col = move
            board.play(row, col, colour)

    stones = build_stones(board)

    marked_dead = [[False] * size for _ in range(size)]
    for gtp in filtered:
        row, col = gtp_to_rowcol(gtp, size)
        marked_dead[row][col] = True

    scores = final_territory_score(
        stones,
        marked_dead,
        black_points_from_captures=black_captures,
        white_points_from_captures=white_captures,
        komi=komi,
    )

    black_score = scores[BLACK]
    white_score = scores[WHITE]
    score_diff = black_score - white_score

    if score_diff > 0:
        result = f"B+{score_diff}"
    elif score_diff < 0:
        result = f"W+{abs(score_diff)}"
    else:
        result = "Draw"

    print(f"calc_score result: {result}", flush=True)

    dead_stones_int = [gtp_to_int(gtp, size) for gtp in filtered]
    return dead_stones_int, result

# ------------------------------------------------------------------ #
# Supabase callback
# ------------------------------------------------------------------ #
def call_server_callback(payload: dict):
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    typed_payload = {f"p_{k}": v for k, v in payload.items()}
    print(f"call_server_callback: {typed_payload}", flush=True)
    resp = requests.post(
        f"{SUPABASE_PROJECT_URL}/rest/v1/rpc/server_callback",
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Accept-Profile": "game",   # ← 追加
            "Content-Profile": "game",  # ← 追加
        },
        json=typed_payload
    )
    print(f"server_callback response: {resp.status_code} {resp.text}", flush=True)

# ------------------------------------------------------------------ #
# kata-analyze出力パーサ
# ------------------------------------------------------------------ #
def parse_kata_analyze_output(out: str, plays: list, size: int) -> list:
    result = []
    for block in out.split("= \n"):
        moves_info = []
        for line in block.strip().split("\n"):
            m = re.match(
                r"info move (\S+) visits (\d+) \S+ ([\d.]+) scoreMean ([\S]+) "
                r".*?winrate ([\d.]+).*?order (\d+).*?pv (.+)",
                line
            )
            if m:
                moves_info.append({
                    "move": m.group(1),
                    "visits": int(m.group(2)),
                    "winrate": float(m.group(5)),
                    "scoreMean": float(m.group(4)),
                    "order": int(m.group(6)),
                    "pv": m.group(7).strip().split(),
                })
        if moves_info:
            result.append(moves_info)
    return result

# ------------------------------------------------------------------ #
# ルート
# ------------------------------------------------------------------ #
@app.route("/score", methods=["POST"])
@require_secret
def score():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    match_id   = data.get("match_id")
    moves      = data.get("moves")
    match_type = data.get("match_type", 0)

    if not match_id:
        return jsonify({"error": "match_id is required"}), 400
    if moves is None:
        return jsonify({"error": "moves is required"}), 400

    try:
        sgf = moves_to_sgf(moves, match_type)
        dead_stones, result = calc_score(sgf)
        call_server_callback({
            "match_id": match_id,
            "dead_stones": dead_stones,
            "result": result,
        })
        return jsonify({"status": "ok"})
    except Exception as e:
        print(f"scoreエラー: {repr(e)}", flush=True)
        return jsonify({"error": str(e)}), 500


@app.route("/play/<engine>", methods=["POST"])
@require_secret
def play(engine):
    if engine not in GO_ENGINES:
        return jsonify({"error": f"Unknown engine: {engine}"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    match_id   = data.get("match_id")
    color      = data.get("color", "white")
    sgf        = data.get("sgf")
    moves      = data.get("moves")
    match_type = data.get("match_type", 0)

    if not match_id:
        return jsonify({"error": "match_id is required"}), 400
    if color not in ("black", "white"):
        return jsonify({"error": "color must be black or white"}), 400
    if not sgf and moves is None:
        return jsonify({"error": "sgf or moves is required"}), 400

    if not sgf:
        sgf = moves_to_sgf(moves, match_type)

    try:
        out = run_gtp(sgf, f"genmove {color}", engine)

        m = re.search(r'=\s*([A-Z]\d+|PASS|RESIGN)', out, re.IGNORECASE)
        next_move = m.group(1).upper() if m else None

        print(f"next_move: {next_move}", flush=True)

        if not next_move or not re.match(r"^([A-Z]\d+|PASS|RESIGN)$", next_move):
            return jsonify({"error": "Invalid move returned"}), 500

        if next_move == "RESIGN":
            # ボットが白なら B+R、黒なら W+R
            result = "B+R" if color == "white" else "W+R"
            call_server_callback({
                "match_id": match_id,
                "result": result,
            })
            return jsonify({"status": "ok"})

        board, plays, komi = parse_sgf(sgf)  # ← resignでなければここへ



        size     = board.side
        move_int = gtp_to_int(next_move, size)
        print(f"move_int: {move_int}, size: {size}", flush=True)

        if next_move == "PASS" and last_move_was_pass(plays):
            dead_stones, result = calc_score(sgf)
            call_server_callback({
                "match_id": match_id,
                "move": move_int,
                "dead_stones": dead_stones,
                "result": result,
            })
        else:
            call_server_callback({
                "match_id": match_id,
                "move": move_int,
            })

        return jsonify({"status": "ok"})

    except Exception as e:
        print(f"playエラー: {repr(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/analyze", methods=["POST"])
@require_secret
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    sgf         = data.get("sgf")
    analysis_id = data.get("analysis_id")

    if not sgf:
        return jsonify({"error": "sgf is required"}), 400
    if not analysis_id:
        return jsonify({"error": "analysis_id is required"}), 400

    try:
        board, plays, komi = parse_sgf(sgf)
        total_moves = len(plays)

        commands = []
        for i in range(total_moves + 1):
            commands.append("kata-analyze 1")
            if i < total_moves:
                colour, move = plays[i][0], plays[i][1]
                if move is None:
                    commands.append(f"play {colour} pass")
                else:
                    row, col = move
                    commands.append(f"play {colour} {rowcol_to_gtp(row, col, board.side)}")

        out    = run_gtp(sgf, "\n".join(commands), "katago-b10c128")
        result = parse_kata_analyze_output(out, plays, board.side)

        call_server_callback({
            "analysis_id": analysis_id,
            "result": result,
        })

        return jsonify({"status": "ok"})

    except Exception as e:
        print(f"analyzeエラー: {repr(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)