# goserver/Dockerfile
# python
FROM python:3.11-slim

#
ENV DATA_DIR=/usr/local/share/pachi
WORKDIR /app

# goscorer: GitHubから直接DL
RUN wget https://raw.githubusercontent.com/lightvector/goscorer/main/python/goscorer.py

# 1. gnugo: aptで用意 うどん
RUN apt-get update && apt-get install -y gnugo unzip wget && \
    rm -rf /var/lib/apt/lists/*

# 2. pachi くるみ
RUN apt-get update && apt-get install -y \
    build-essential git && \
    rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch pachi-12.88 https://github.com/pasky/pachi.git && \
    cd pachi && \
    make DCNN=0 JOSEKIFIX=0 && \
    cp pachi /usr/local/bin/pachi && \
    mkdir -p /usr/local/share/pachi && \
    cp patterns_mm.spat patterns_mm.gamma /usr/local/share/pachi/

# katago: GitHubからDL
RUN wget https://github.com/lightvector/KataGo/releases/download/v1.16.4/katago-v1.16.4-eigen-linux-x64.zip && \
    unzip katago-v1.16.4-eigen-linux-x64.zip && \
    rm -rf katago-v1.16.4-eigen-linux-x64 katago-v1.16.4-eigen-linux-x64.zip && \
    chmod +x katago

# 3. kataGo_b6c96 せな
RUN wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s175395328-d26788732.txt.gz && \
    gunzip kata1-b6c96-s175395328-d26788732.txt.gz

# 4. leela るな
RUN wget https://www.sjeng.org/dl/Leela0110GTP.zip && \
    unzip -o Leela0110GTP.zip && \
    chmod +x leela_0110_linux_x64 && \
    cp leela_0110_linux_x64 /usr/local/bin/leela && \
    rm Leela0110GTP.zip

# 5. kataGo_b10c128 うさぎせんせい
RUN wget https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b10c128-s1141046784-d204142634.txt.gz && \
    gunzip kata1-b10c128-s1141046784-d204142634.txt.gz

# requirements.txt コピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体コピー
COPY . .

# ポート開放
EXPOSE 8080

# 本番用Gunicornで起動
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:8080", "app:app"]