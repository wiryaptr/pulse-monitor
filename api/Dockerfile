FROM docker.io/library/python:3.14-slim@sha256:a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170

LABEL org.opencontainers.image.source="https://github.com/wiryaptr/pulse-monitor" \
      org.opencontainers.image.description="Pulse Monitor API (FastAPI)"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

COPY requirements.txt .
# pip dibuang setelah dependensi terpasang. Saat berjalan, aplikasi tidak memakainya, dan pip membundel
# salinan pustaka (urllib3, requests, certifi) yang kerap dilaporkan pemindai walau tidak pernah dipakai.
RUN pip install -r requirements.txt \
    && pip uninstall -y pip

COPY main.py .

# Jalan sebagai user biasa, bukan root. Aplikasi tidak menulis ke disk, jadi aman dengan rootfs read-only.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin pulse
USER 10001

EXPOSE 8000

# Dipakai pada image berformat docker. Podman membuat format OCI secara bawaan dan mengabaikan baris ini,
# jadi bangun dengan: podman build --format docker
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"]

# SSE membuat koneksi terbuka terus. Tanpa batas ini uvicorn tidak berhenti saat SIGTERM dan engine harus
# mengirim SIGKILL setelah 10 detik. Tes: api/tests/test_shutdown.py
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "3"]
