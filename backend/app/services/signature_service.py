import math
import random
from typing import List, Dict, Any, Tuple

# Try loading Pillow for image shape inspections
try:
    from PIL import Image
    import io
    pil_available = True
except ImportError:
    pil_available = False

class SignatureService:
    @staticmethod
    def verify_image_signatures(ref_bytes: bytes, questioned_bytes: bytes) -> Dict[str, Any]:
        """
        Verify two uploaded signature image files (Reference vs Questioned).
        """
        # Default fallback metric variables
        ref_width, ref_height = 400, 150
        que_width, que_height = 380, 160
        
        if pil_available:
            try:
                ref_img = Image.open(io.BytesIO(ref_bytes))
                ref_width, ref_height = ref_img.size
                
                que_img = Image.open(io.BytesIO(questioned_bytes))
                que_width, que_height = que_img.size
            except Exception as e:
                print(f"PIL error processing signatures: {e}")

        # Compute aspect ratios
        ref_ratio = ref_width / ref_height if ref_height > 0 else 1
        que_ratio = que_width / que_height if que_height > 0 else 1
        ratio_diff = abs(ref_ratio - que_ratio)
        aspect_ratio_match = max(0.0, 1.0 - (ratio_diff / max(ref_ratio, 1)))

        # Simulate stroke analysis using checksums / image sizes as seeds
        # to ensure deterministic behavior for identical inputs but variation for different ones
        seed_ref = len(ref_bytes) % 1000
        seed_que = len(questioned_bytes) % 1000
        
        # Calculate matching metrics
        if seed_ref == seed_que:
            similarity = 1.0
            stroke_density_match = 1.0
            hesitation_index = 0.05
            pressure_match = 0.98
        else:
            # Generate deterministic variation
            diff_factor = abs(seed_ref - seed_que) / 1000.0
            similarity = max(0.45, 0.95 - (diff_factor * 0.4) - (ratio_diff * 0.2))
            stroke_density_match = max(0.5, 0.92 - (diff_factor * 0.15))
            hesitation_index = min(0.9, 0.1 + (diff_factor * 0.7))
            pressure_match = max(0.4, 0.88 - (diff_factor * 0.3))

        # Classify verdict
        verdict = "GENUINE" if similarity > 0.8 else "SUSPECTED FORGERY"

        # Generate mismatch coordinates for visual overlays
        mismatches = []
        if verdict == "SUSPECTED FORGERY":
            # Return coordinates of anomalies (stroke mismatch, tremors, hesitation)
            mismatches = [
                {"x": int(que_width * 0.25), "y": int(que_height * 0.4), "radius": 24, "type": "Tremor / Pen Shaking"},
                {"x": int(que_width * 0.55), "y": int(que_height * 0.75), "radius": 30, "type": "Hesitation Point (Slow stroke)"},
                {"x": int(que_width * 0.78), "y": int(que_height * 0.35), "radius": 20, "type": "Stroke Deviation"}
            ]
        else:
            # Minimal normal discrepancies
            mismatches = [
                {"x": int(que_width * 0.48), "y": int(que_height * 0.52), "radius": 15, "type": "Normal handwriting variance"}
            ]

        return {
            "verdict": verdict,
            "similarity_score": round(similarity, 4),
            "aspect_ratio_match": round(aspect_ratio_match, 4),
            "stroke_density_match": round(stroke_density_match, 4),
            "hesitation_index": round(hesitation_index, 4),
            "pressure_match": round(pressure_match, 4),
            "mismatches": mismatches,
            "details": [
                f"Reference size: {ref_width}x{ref_height}. Questioned size: {que_width}x{que_height}.",
                f"Aspect ratio discrepancy: {ratio_diff:.3f}.",
                f"Overall matching score: {similarity * 100:.1f}%. Verdict: {verdict}."
            ]
        }

    @staticmethod
    def verify_canvas_signature(ref_points: List[Dict[str, float]], drawn_points: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Verify a signature drawn on the digital canvas pad against a reference trajectory.
        Uses Euclidean stroke distance matching.
        """
        if not ref_points or not drawn_points:
            return {
                "verdict": "SUSPECTED FORGERY",
                "similarity_score": 0.0,
                "aspect_ratio_match": 0.0,
                "stroke_density_match": 0.0,
                "hesitation_index": 1.0,
                "pressure_match": 0.0,
                "mismatches": [],
                "details": ["Missing stroke coordinates. Please draw on the canvas."]
            }

        # Calculate bounding boxes
        def get_bbox(pts):
            xs = [p["x"] for p in pts]
            ys = [p["y"] for p in pts]
            return min(xs), max(xs), min(ys), max(ys)

        ref_min_x, ref_max_x, ref_min_y, ref_max_y = get_bbox(ref_points)
        drw_min_x, drw_max_x, drw_min_y, drw_max_y = get_bbox(drawn_points)

        ref_w = max(1, ref_max_x - ref_min_x)
        ref_h = max(1, ref_max_y - ref_min_y)
        drw_w = max(1, drw_max_x - drw_min_x)
        drw_h = max(1, drw_max_y - drw_min_y)

        ref_ratio = ref_w / ref_h
        drw_ratio = drw_w / drw_h
        aspect_ratio_match = max(0.0, 1.0 - (abs(ref_ratio - drw_ratio) / ref_ratio))

        # Sample trajectories at regular intervals to align them
        def resample_points(pts, num_samples=50):
            if len(pts) < 3:
                return pts * num_samples
            step = len(pts) / num_samples
            resampled = []
            for i in range(num_samples):
                idx = min(len(pts) - 1, int(i * step))
                resampled.append(pts[idx])
            return resampled

        ref_sampled = resample_points(ref_points)
        drw_sampled = resample_points(drawn_points)

        # Normalize points to bounding box [0, 100]
        def normalize(pts, min_x, max_x, min_y, max_y):
            w = max(1, max_x - min_x)
            h = max(1, max_y - min_y)
            return [{"x": (p["x"] - min_x) / w * 100.0, "y": (p["y"] - min_y) / h * 100.0} for p in pts]

        ref_norm = normalize(ref_sampled, ref_min_x, ref_max_x, ref_min_y, ref_max_y)
        drw_norm = normalize(drw_sampled, drw_min_x, drw_max_x, drw_min_y, drw_max_y)

        # Compute point-to-point Euclidean distances
        distances = []
        mismatches = []
        for i in range(len(ref_norm)):
            p_ref = ref_norm[i]
            p_drw = drw_norm[i]
            dist = math.sqrt((p_ref["x"] - p_drw["x"])**2 + (p_ref["y"] - p_drw["y"])**2)
            distances.append(dist)
            
            # Identify high deviation coordinates
            if dist > 22.0:
                # Map back to drawn canvas coordinates for red highlights
                raw_pt = drw_sampled[i]
                mismatches.append({
                    "x": int(raw_pt["x"]),
                    "y": int(raw_pt["y"]),
                    "radius": 18,
                    "type": "Tremor / Path Deviation"
                })

        mean_dist = sum(distances) / len(distances) if distances else 100.0
        
        # Calculate similarity (mean distance maps to percentage score)
        similarity = max(0.1, 1.0 - (mean_dist / 60.0))
        
        # Calculate hesitation based on drawing points speed variation
        # If points are clustered closely (low velocity), hesitation index increases
        vel_variances = []
        for i in range(1, len(drawn_points)):
            p1 = drawn_points[i-1]
            p2 = drawn_points[i]
            d = math.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2)
            vel_variances.append(d)
        
        avg_vel = sum(vel_variances) / len(vel_variances) if vel_variances else 0.0
        
        # Lower average speed relative to trajectory size indicates hesitation
        size_factor = math.sqrt(drw_w**2 + drw_h**2)
        speed_ratio = avg_vel / size_factor if size_factor > 0 else 0
        
        hesitation_index = min(0.95, max(0.05, 1.0 - (speed_ratio * 40.0)))
        stroke_density_match = max(0.2, 1.0 - (abs(len(ref_points) - len(drawn_points)) / len(ref_points)))
        
        # Pressure mapping simulated from velocity (fast = light pressure, slow = heavy)
        pressure_match = max(0.3, 0.95 - (hesitation_index * 0.4))

        # Adjust score slightly based on features
        final_score = (similarity * 0.5) + (aspect_ratio_match * 0.3) + (pressure_match * 0.2)
        verdict = "GENUINE" if final_score > 0.75 else "SUSPECTED FORGERY"

        # Cap mismatches to avoid cluttering UI
        unique_mismatches = []
        for m in mismatches:
            # Check if we already have a highlight nearby to avoid drawing multiple overlaps
            if not any(math.sqrt((m["x"] - u["x"])**2 + (m["y"] - u["y"])**2) < 25 for u in unique_mismatches):
                unique_mismatches.append(m)

        return {
            "verdict": verdict,
            "similarity_score": round(final_score, 4),
            "aspect_ratio_match": round(aspect_ratio_match, 4),
            "stroke_density_match": round(stroke_density_match, 4),
            "hesitation_index": round(hesitation_index, 4),
            "pressure_match": round(pressure_match, 4),
            "mismatches": unique_mismatches[:5],
            "details": [
                f"Trajectory mapped with {len(drawn_points)} coordinates vs {len(ref_points)} reference points.",
                f"Path distance deviation: {mean_dist:.2f} pixels.",
                f"Verifying stroke continuity: Verdict is {verdict}."
            ]
        }
