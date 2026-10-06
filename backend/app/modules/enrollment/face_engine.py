"""Offline face detection + embedding via OpenCV's bundled YuNet (detector)
and SFace (128-d embedding, cosine match) ONNX models -- no cloud API, no
GPU required. Ported from the reference project's app/worker_monitor/face_id.py,
simplified for this app's use case: every image handed in here (an
enrollment photo, or a browser webcam snapshot) is already expected to be
roughly a face photo, so there's no person-bounding-box crop step -- the
detector just runs on the full frame.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_WEIGHTS_DIR = Path(__file__).resolve().parent / "weights"
DETECTOR_PATH = _WEIGHTS_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNIZER_PATH = _WEIGHTS_DIR / "face_recognition_sface_2021dec.onnx"

# Real-time CPU inference needs a downscaled frame -- the reference project
# measured ~9x slowdown at full 4K vs this size.
MAX_SIDE = 480


def _downscale(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    scale = MAX_SIDE / max(h, w)
    if scale >= 1:
        return image
    return cv2.resize(image, (int(w * scale), int(h * scale)))


class FaceEngine:
    def __init__(self) -> None:
        if not DETECTOR_PATH.exists() or not RECOGNIZER_PATH.exists():
            raise FileNotFoundError(f"Face model weights not found under {_WEIGHTS_DIR}")
        self.detector = cv2.FaceDetectorYN_create(str(DETECTOR_PATH), "", (320, 320), score_threshold=0.8)
        self.recognizer = cv2.FaceRecognizerSF_create(str(RECOGNIZER_PATH), "")

    def detect_and_embed(self, image: np.ndarray) -> np.ndarray | None:
        """Detects the most confident face in `image` and returns its
        128-d embedding, or None if no face was found."""
        image = _downscale(image)
        self.detector.setInputSize((image.shape[1], image.shape[0]))
        _, faces = self.detector.detect(image)
        if faces is None or len(faces) == 0:
            return None
        best_face = max(faces, key=lambda f: f[-1])
        aligned = self.recognizer.alignCrop(image, best_face)
        return self.recognizer.feature(aligned)

    def match_score(self, embedding: np.ndarray, reference: np.ndarray) -> float:
        return float(
            self.recognizer.match(embedding, reference.reshape(1, -1), cv2.FaceRecognizerSF_FR_COSINE)
        )


@lru_cache
def get_face_engine() -> FaceEngine:
    return FaceEngine()


def decode_image(image_bytes: bytes) -> np.ndarray | None:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)
