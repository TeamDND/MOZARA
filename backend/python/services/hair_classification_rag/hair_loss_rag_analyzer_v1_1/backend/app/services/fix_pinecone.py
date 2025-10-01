import os

with open('pinecone_manager.py', 'r', encoding='utf-8') as f:
    content = f.read()

# top_k=1 -> top_k=10
content = content.replace(
    "top_k=1,  # 가장 대표적인 1개만",
    "top_k=10,"
)

# first_match 로직을 for 루프로 변경
old_block = '''                if matches:
                    first_match = matches[0]
                    md = first_match['metadata'] if isinstance(first_match, dict) else getattr(first_match, 'metadata', {})
                    path = md.get('path', '')
                    if path:
                        # 경로 변환: 기존 경로를 실제 파일 위치로 매핑
                        # hair_loss_preprocessed -> male_for_ragdata_final/hair_loss_classification_modified_cleared/male
                        if 'hair_loss_preprocessed' in path:
                            path = path.replace(
                                'C:\\Users\\301\\Desktop\\hair_loss_preprocessed',
                                'C:\\Users\\301\\Desktop\\male_for_ragdata_final\\hair_loss_classification_modified_cleared\\male'
                            )
                        # hair_loss_classification_modified_cleared (male 직접 경로)
                        elif 'C:\\Users\\301\\Desktop\\hair_loss_classification_modified_cleared' in path and '\\male\\' in path:
                            path = path.replace(
                                'C:\\Users\\301\\Desktop\\hair_loss_classification_modified_cleared',
                                'C\\Users\\301\\Desktop\\male_for_ragdata_final\\hair_loss_classification_modified_cleared'
                            )

                        reference_images[view_key] = path
                        self.logger.info(f"Found reference {view_key} image for stage {predicted_stage}: {path}")'''

new_block = '''                if matches:
                    for match in matches:
                        md = match['metadata'] if isinstance(match, dict) else getattr(match, 'metadata', {})
                        path = md.get('path', '')
                        if path:
                            if 'hair_loss_preprocessed' in path:
                                path = path.replace(
                                    'C:\\Users\\301\\Desktop\\hair_loss_preprocessed',
                                    'C:\\Users\\301\\Desktop\\male_for_ragdata_final\\hair_loss_classification_modified_cleared\\male'
                                )
                            elif 'C:\\Users\\301\\Desktop\\hair_loss_classification_modified_cleared' in path and '\\male\\' in path:
                                path = path.replace(
                                    'C:\\Users\\301\\Desktop\\hair_loss_classification_modified_cleared',
                                    'C:\\Users\\301\\Desktop\\male_for_ragdata_final\\hair_loss_classification_modified_cleared'
                                )

                            if os.path.exists(path):
                                reference_images[view_key] = path
                                self.logger.info(f"Found reference {view_key} image for stage {predicted_stage}: {path}")
                                break
                            else:
                                self.logger.warning(f"File not found, skipping: {path}")'''

content = content.replace(old_block, new_block)

with open('pinecone_manager.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
