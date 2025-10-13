"""
DensityVisualizer    ( )
"""

import os
import sys

#   sys.path 
current_dir = os.path.dirname(os.path.abspath(__file__))
time_series_dir = os.path.dirname(current_dir)
services_root = os.path.dirname(time_series_dir)
backend_python_dir = os.path.dirname(services_root)

sys.path.insert(0, backend_python_dir)  # backend/python
sys.path.insert(0, services_root)        # backend/python/services

from time_series.services.density_visualizer import DensityVisualizer
from time_series.services.density_analyzer import DensityAnalyzer
from PIL import Image, ImageDraw
import io
import numpy as np


def create_test_image():
    """
        
    512x512 ,    (),   ()
    """
    print("[IMG]    ...")

    # 512x512 RGB  
    img = Image.new('RGB', (512, 512), color=(200, 180, 160))  #  
    draw = ImageDraw.Draw(img)

    #     ()
    draw.ellipse([(100, 50), (412, 462)], fill=(50, 40, 30))  #   ( )

    #     ( )
    draw.ellipse([(200, 150), (300, 250)], fill=(120, 100, 80))  #  1
    draw.ellipse([(320, 200), (400, 300)], fill=(140, 120, 100))  #  2

    print("[OK]     (512x512)")
    return img


def test_with_fake_image():
    """ 1:    (BiSeNet )"""
    print("\n" + "=" * 60)
    print(" 1:   +    ")
    print("=" * 60)

    try:
        # 1.   
        test_image = create_test_image()

        # 2.  bytes 
        img_buffer = io.BytesIO()
        test_image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        image_bytes = img_buffer.read()

        print(f" : {len(image_bytes)} bytes")

        # 3.    
        density_result = {
            'hair_density_percentage': 45.2,
            'distribution_map': [
                [50, 48, 52, 55, 53, 49, 51, 54],
                [48, 45, 47, 50, 52, 48, 50, 53],
                [45, 42, 25, 48, 50, 45, 48, 51],  # 25 = 
                [43, 40, 28, 45, 48, 43, 46, 49],  # 28 = 
                [42, 38, 30, 42, 45, 40, 44, 47],  # 30 = 
                [40, 35, 32, 40, 43, 38, 42, 45],
                [38, 33, 35, 38, 40, 36, 40, 43],
                [35, 30, 33, 35, 38, 34, 38, 41]
            ]
        }

        print(f" : {density_result['hair_density_percentage']}%")
        print(f"  : (2,2)=25%, (3,2)=28%, (4,2)=30%")

        # 4. 
        visualizer = DensityVisualizer(threshold=30.0, circle_color=(0, 255, 0))
        visualized_bytes = visualizer.visualize_low_density_regions(
            image_bytes,
            density_result,
            threshold=30.0
        )

        # 5.  
        output_path = os.path.join(current_dir, "test_output_fake.jpg")
        with open(output_path, 'wb') as f:
            f.write(visualized_bytes)

        print(f"[OK]  !  : {output_path}")
        print(f"   -   3  ( 30% )")

        return True

    except Exception as e:
        print(f"[FAIL]  : {e}")
        import traceback
        traceback.print_exc()
        return False


def test_with_real_image_file():
    """ 2:     (BiSeNet )"""
    print("\n" + "=" * 60)
    print(" 2:    + BiSeNet  ")
    print("=" * 60)

    #    (  )
    test_image_path = "C:/Users/301/Desktop/test_hair_image.jpg"

    if not os.path.exists(test_image_path):
        print(f"[WARN]   : {test_image_path}")
        print(f"       ,")
        print(f"   test_image_path  .")
        return False

    try:
        print(f"[LOAD]  : {test_image_path}")

        # 1.   
        with open(test_image_path, 'rb') as f:
            image_bytes = f.read()

        print(f" : {len(image_bytes)} bytes")

        # 2. BiSeNet  
        print("[SEARCH] BiSeNet   ...")
        analyzer = DensityAnalyzer(device='cpu')
        density_result = analyzer.calculate_density(image_bytes)

        print(f" : {density_result['hair_density_percentage']}%")
        print(f" : {density_result['top_region_density']}%")
        print(f" : {density_result['middle_region_density']}%")
        print(f" : {density_result['bottom_region_density']}%")

        # 3. 
        print("[DRAW]  ...")
        visualizer = DensityVisualizer(threshold=30.0, circle_color=(0, 255, 0))
        visualized_bytes = visualizer.visualize_low_density_regions(
            image_bytes,
            density_result,
            threshold=30.0
        )

        # 4.  
        output_path = os.path.join(current_dir, "test_output_real.jpg")
        with open(output_path, 'wb') as f:
            f.write(visualized_bytes)

        print(f"[OK]  !  : {output_path}")
        print(f"       ")

        return True

    except Exception as e:
        print(f"[FAIL]  : {e}")
        import traceback
        traceback.print_exc()
        return False


def test_with_url():
    """ 3:   URL  (API  )"""
    print("\n" + "=" * 60)
    print(" 3:   URL + API ")
    print("=" * 60)

    import requests

    #   URL ( URL )
    test_image_url = "https://example.com/hair_image.jpg"

    # API  (FastAPI   )
    api_url = "http://localhost:8000/timeseries/visualize-density"

    print(f"[WARN]   FastAPI    .")
    print(f"    : cd backend/python && uvicorn app:app --reload")
    print()
    print(f"[WEB] API : POST {api_url}")
    print(f"[PHOTO]  URL: {test_image_url}")

    try:
        # API 
        response = requests.post(
            api_url,
            json={
                "image_url": test_image_url,
                "threshold": 30.0
            },
            timeout=30
        )

        if response.status_code == 200:
            #  
            output_path = os.path.join(current_dir, "test_output_api.jpg")
            with open(output_path, 'wb') as f:
                f.write(response.content)

            print(f"[OK] API  !  : {output_path}")
            return True
        else:
            print(f"[FAIL] API  : {response.status_code}")
            print(f"   : {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("[FAIL]   . FastAPI    .")
        return False
    except Exception as e:
        print(f"[FAIL]  : {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """  """
    print("\n" + "=" * 60)
    print("DensityVisualizer  ")
    print("=" * 60)

    results = []

    #  1:   ( )
    print("\n[ 1/3]")
    result1 = test_with_fake_image()
    results.append((" 1:  ", result1))

    #  2:    (  )
    print("\n[ 2/3]")
    result2 = test_with_real_image_file()
    results.append((" 2:  ", result2))

    #  3: API  (   )
    print("\n[ 3/3]")
    result3 = test_with_url()
    results.append((" 3: API ", result3))

    #  
    print("\n" + "=" * 60)
    print("  ")
    print("=" * 60)
    for name, success in results:
        status = "[OK] " if success else "[FAIL] "
        print(f"{status} - {name}")

    print("\n" + "=" * 60)
    print(" :")
    print("=" * 60)
    print("1. test_output_*.jpg  ")
    print("2.      ")
    print("3.   API ( 3) ")
    print("=" * 60)


if __name__ == "__main__":
    main()
