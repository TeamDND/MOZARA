with open('pinecone_manager.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 367번 라인 (0-indexed 366): top_k=1 -> top_k=10
lines[366] = '                    top_k=10,\n'

# 375-394 (0-indexed 374-393) 변경
lines[374] = '                if matches:\n'
lines[375] = '                    for match in matches:\n'
lines[376] = '                        md = match[\'metadata\'] if isinstance(match, dict) else getattr(match, \'metadata\', {})\n'
lines[377] = '                        path = md.get(\'path\', \'\')\n'
lines[378] = '                        if path:\n'
lines[379] = '                            if \'hair_loss_preprocessed\' in path:\n'
lines[380] = '                                path = path.replace(\n'
lines[381] = '                                    \'C:\\\\Users\\\\301\\\\Desktop\\\\hair_loss_preprocessed\',\n'
lines[382] = '                                    \'C:\\\\Users\\\\301\\\\Desktop\\\\male_for_ragdata_final\\\\hair_loss_classification_modified_cleared\\\\male\'\n'
lines[383] = '                                )\n'
lines[384] = '                            elif \'C:\\\\Users\\\\301\\\\Desktop\\\\hair_loss_classification_modified_cleared\' in path and \'\\\\male\\\\\' in path:\n'
lines[385] = '                                path = path.replace(\n'
lines[386] = '                                    \'C:\\\\Users\\\\301\\\\Desktop\\\\hair_loss_classification_modified_cleared\',\n'
lines[387] = '                                    \'C:\\\\Users\\\\301\\\\Desktop\\\\male_for_ragdata_final\\\\hair_loss_classification_modified_cleared\'\n'
lines[388] = '                                )\n'
lines[389] = '\n'
lines[390] = '                            if os.path.exists(path):\n'
lines[391] = '                                reference_images[view_key] = path\n'
lines[392] = '                                self.logger.info(f"Found reference {view_key} image for stage {predicted_stage}: {path}")\n'
lines[393] = '                                break\n'
lines[394] = '                            else:\n'
lines.insert(395, '                                self.logger.warning(f"File not found, skipping: {path}")\n')

with open('pinecone_manager.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Done!")
