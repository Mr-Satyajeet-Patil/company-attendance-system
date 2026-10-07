from deepface import DeepFace
from .models import Employee


def recognize_employee(image_path):
    employees = Employee.objects.filter(
        is_active=True,
        face_image__isnull=False
    )

    for employee in employees:

        try:
            result = DeepFace.verify(
                img1_path=image_path,
                img2_path=employee.face_image.path,
                model_name="Facenet512",
                detector_backend="opencv",
                enforce_detection=True
            )

            if result["verified"]:
                return employee

        except Exception as e:
            print(
                f"Face verification failed for "
                f"{employee.employee_id}: {e}"
            )

    return None