# Captions worker for the Kodai 1994 page (worker.py): speech to text on the CPU with
# faster-whisper (Whisper large-v3-turbo, int8). The model is downloaded once into
# CAPTIONS_MODELS (worker.py --download, the only time it needs the network).
FROM python:3.12.11-slim-bookworm
RUN pip install --no-cache-dir faster-whisper==1.1.1 numpy==2.2.6 requests==2.32.3 av==12.3.0
COPY worker.py /app/worker.py
CMD ["python3", "-I", "/app/worker.py"]
