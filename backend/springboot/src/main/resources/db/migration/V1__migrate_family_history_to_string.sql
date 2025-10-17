-- family_history 컬럼을 숫자에서 문자열로 변환
-- 작성일: 2025-01-10
-- 목적: 기존 숫자 형식('0', '1', '2', '3')을 의미있는 문자열('none', 'father', 'mother', 'both')로 변경

-- 1. 컬럼 타입을 VARCHAR(20)으로 변경 (이미 VARCHAR면 스킵됨)
ALTER TABLE users_info MODIFY COLUMN family_history VARCHAR(20);

-- 2. 기존 데이터 마이그레이션
UPDATE users_info SET family_history = 'father' WHERE family_history = '1';
UPDATE users_info SET family_history = 'mother' WHERE family_history = '2';
UPDATE users_info SET family_history = 'both' WHERE family_history = '3';
UPDATE users_info SET family_history = 'none' WHERE family_history = '0' OR family_history IS NULL OR family_history = '';
