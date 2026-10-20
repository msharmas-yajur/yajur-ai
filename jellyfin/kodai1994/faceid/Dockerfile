# Face identification worker for the Kodai 1994 page (worker.py). CPU only.
FROM python:3.12.11-slim-bookworm
RUN pip install --no-cache-dir onnxruntime==1.22.1 opencv-python-headless==4.12.0.88 numpy==2.2.6
COPY worker.py /app/worker.py
CMD ["python3", "-I", "/app/worker.py"]
