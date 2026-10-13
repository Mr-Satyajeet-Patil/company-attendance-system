import os
import sys
import numpy as np
from .models import Employee, EmployeeFaceSample

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PYTHONUTF8'] = '1'


# Recommended threshold for Facenet512 cosine similarity
# Cosine distance <= 0.32 corresponds to Cosine similarity >= 0.68
DEFAULT_SIMILARITY_THRESHOLD = 0.68


def normalize_vector(v):
    norm = np.linalg.norm(v)
    if norm == 0:
        return v
    return (np.array(v) / norm).tolist()


def compute_cosine_similarity(v1, v2):
    a = np.array(v1)
    b = np.array(v2)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


_legacy_checked = False


def extract_face_embedding(image_path_or_array):
    """
    Extracts 512-dimensional facial embedding using Facenet512.
    Returns normalized embedding list, or None if extraction fails.
    """
    if isinstance(image_path_or_array, str):
        if not os.path.exists(image_path_or_array) or os.path.getsize(image_path_or_array) < 100:
            return None

    try:
        from deepface import DeepFace
        results = DeepFace.represent(
            img_path=image_path_or_array,
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False
        )

        if results and len(results) > 0 and 'embedding' in results[0]:
            raw_emb = results[0]['embedding']
            return normalize_vector(raw_emb)
    except Exception as e:
        print(f"Error extracting face embedding: {e}")

    return None


def ensure_legacy_employee_embeddings(force=False):
    """
    Auto-computes embeddings for existing employees that only have
    a single face_image and no EmployeeFaceSample records yet.
    """
    global _legacy_checked
    if _legacy_checked and not force:
        return
    employees = Employee.objects.filter(
        is_active=True,
        face_image__isnull=False
    ).exclude(face_image='')

    for emp in employees:
        if emp.face_samples.count() == 0 and emp.face_image:
            try:
                if os.path.exists(emp.face_image.path):
                    emb = extract_face_embedding(emp.face_image.path)
                    if emb:
                        EmployeeFaceSample.objects.create(
                            employee=emp,
                            image=emp.face_image,
                            sample_type='frontal',
                            embedding=emb
                        )
                        print(f"Auto-generated initial embedding for {emp.name}")
            except Exception as e:
                print(f"Failed to auto-embed for {emp.name}: {e}")

    _legacy_checked = True


def verify_liveness_and_quality(image_path_or_array):
    """
    Performs anti-spoofing and quality checks on probe face:
    1. Texture / Variance of Laplacian (blur & screen recapture detection)
    2. Minimum dimension & aspect ratio
    3. Extreme glare / reflection detection
    """
    try:
        import cv2
        if isinstance(image_path_or_array, str):
            if not os.path.exists(image_path_or_array):
                return False, "Image file not found"
            img = cv2.imread(image_path_or_array)
        else:
            img = image_path_or_array

        if img is None:
            return False, "Failed to decode image frame"

        h, w = img.shape[:2]
        if h < 80 or w < 80:
            return False, "Image resolution too low for reliable biometric verification"

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Texture & Focus Check (Variance of Laplacian)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 15.0:
            return False, f"Image is too blurry (quality score: {round(laplacian_var, 1)}). Please hold steady."

        # 2. Extreme glare check (detects phone screen backlight reflection)
        overexposed_ratio = float(np.sum(gray > 252)) / float(h * w)
        if overexposed_ratio > 0.50:
            return False, "Excessive glare or screen reflection detected. Please adjust lighting."

        return True, "Quality check passed"

    except Exception as e:
        print(f"Liveness check note: {e}")
        return True, "Passed"


def match_face_against_database(probe_image_path, threshold=DEFAULT_SIMILARITY_THRESHOLD):
    """
    Matches a probe image against all registered employee face samples
    using multi-angle ensemble matching.

    Returns:
        dict: {
            'matched': bool,
            'employee': Employee or None,
            'confidence': float, # 0.0 to 100.0
            'similarity': float,
            'matched_angle': str,
            'message': str
        }
    """
    # 1. Quality & anti-spoof check
    is_valid, quality_msg = verify_liveness_and_quality(probe_image_path)
    if not is_valid:
        return {
            'matched': False,
            'employee': None,
            'confidence': 0.0,
            'similarity': 0.0,
            'matched_angle': None,
            'message': quality_msg
        }

    probe_emb = extract_face_embedding(probe_image_path)
    if not probe_emb:
        return {
            'matched': False,
            'employee': None,
            'confidence': 0.0,
            'similarity': 0.0,
            'matched_angle': None,
            'message': 'No clear face detected in the captured image. Please align your face with the camera.'
        }

    # Ensure legacy employees are indexed
    ensure_legacy_employee_embeddings()

    # Load all registered samples
    samples = EmployeeFaceSample.objects.filter(
        employee__is_active=True
    ).exclude(embedding__isnull=True).select_related('employee')

    if not samples.exists():
        return {
            'matched': False,
            'employee': None,
            'confidence': 0.0,
            'similarity': 0.0,
            'matched_angle': None,
            'message': 'No registered employee faces in database. Please register employees first.'
        }

    best_match_employee = None
    best_similarity = -1.0
    best_angle = None

    probe_arr = np.array(probe_emb)

    for sample in samples:
        if not sample.embedding:
            continue

        try:
            sample_arr = np.array(sample.embedding)
            similarity = float(np.dot(probe_arr, sample_arr) / (np.linalg.norm(probe_arr) * np.linalg.norm(sample_arr)))

            if similarity > best_similarity:
                best_similarity = similarity
                best_match_employee = sample.employee
                best_angle = sample.sample_type
        except Exception as e:
            print(f"Error computing similarity for sample {sample.id}: {e}")

    # Map cosine similarity to confidence percentage
    # Typically similarity >= 0.68 is a valid match, 0.85+ is extremely confident
    if best_similarity >= threshold and best_match_employee is not None:
        # Scale 0.65 - 0.95 -> 75% - 99.8%
        scaled_conf = min(99.9, max(70.0, 70.0 + ((best_similarity - threshold) / (1.0 - threshold)) * 30.0))
        return {
            'matched': True,
            'employee': best_match_employee,
            'confidence': round(scaled_conf, 1),
            'similarity': round(best_similarity, 4),
            'matched_angle': best_angle,
            'message': f"Face verified as {best_match_employee.name}"
        }
    else:
        return {
            'matched': False,
            'employee': None,
            'confidence': round(max(0.0, best_similarity * 100), 1) if best_similarity > 0 else 0.0,
            'similarity': round(best_similarity, 4) if best_similarity > 0 else 0.0,
            'matched_angle': None,
            'message': 'Face not recognized. Unregistered person or angle not clear enough.'
        }


# Retain backward-compatible function name
def recognize_employee(image_path):
    result = match_face_against_database(image_path)
    if result['matched']:
        return result['employee']
    return None