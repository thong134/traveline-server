-- ============================================================================
-- Vietnam administrative mapping seed data
-- This script mirrors the contents of src/data/admin-mapping.json so that the
-- mappings can be loaded directly into PostgreSQL.
-- Target table: vn_admin_unit_mappings
-- Columns: old_province_code, old_district_code, old_ward_code,
--          new_province_code, new_commune_code, note, resolution_ref
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Province-level mappings (legacy provinces -> reform provinces)
-- ---------------------------------------------------------------------------
INSERT INTO vn_admin_unit_mappings (
	old_province_code,
	old_district_code,
	old_ward_code,
	new_province_code,
	new_commune_code,
	note,
	resolution_ref
)
VALUES
	('01', NULL, NULL, '01', NULL, 'Thanh pho Ha Noi giu nguyen, khong sap nhap.', 'NQ/2025/QH15-01'),
	('04', NULL, NULL, '04', NULL, 'Tinh Cao Bang giu nguyen, khong sap nhap.', 'NQ/2025/QH15-04'),
	('02', NULL, NULL, '08', NULL, 'Hop nhat toan bo tinh Ha Giang (02) vao tinh Tuyen Quang (08) theo nghi quyet sap xep don vi hanh chinh nam 2025.', 'NQ/2025/QH15-08'),
	('08', NULL, NULL, '08', NULL, 'Hop nhat toan bo tinh Ha Giang (02) vao tinh Tuyen Quang (08) theo nghi quyet sap xep don vi hanh chinh nam 2025.', 'NQ/2025/QH15-08'),
	('11', NULL, NULL, '11', NULL, 'Tinh Dien Bien giu nguyen, khong sap nhap.', 'NQ/2025/QH15-11'),
	('12', NULL, NULL, '12', NULL, 'Tinh Lai Chau giu nguyen, khong sap nhap.', 'NQ/2025/QH15-12'),
	('14', NULL, NULL, '14', NULL, 'Tinh Son La giu nguyen, khong sap nhap.', 'NQ/2025/QH15-14'),
	('10', NULL, NULL, '15', NULL, 'Hop nhat tinh Lao Cai (10) va tinh Yen Bai (15) de hinh thanh tinh Lao Cai moi.', 'NQ/2025/QH15-15'),
	('15', NULL, NULL, '15', NULL, 'Hop nhat tinh Lao Cai (10) va tinh Yen Bai (15) de hinh thanh tinh Lao Cai moi.', 'NQ/2025/QH15-15'),
	('06', NULL, NULL, '19', NULL, 'Hop nhat tinh Bac Kan (06) va tinh Thai Nguyen (19) de hinh thanh tinh Thai Nguyen moi.', 'NQ/2025/QH15-19'),
	('19', NULL, NULL, '19', NULL, 'Hop nhat tinh Bac Kan (06) va tinh Thai Nguyen (19) de hinh thanh tinh Thai Nguyen moi.', 'NQ/2025/QH15-19'),
	('20', NULL, NULL, '20', NULL, 'Tinh Lang Son giu nguyen, khong sap nhap.', 'NQ/2025/QH15-20'),
	('22', NULL, NULL, '22', NULL, 'Tinh Quang Ninh giu nguyen, khong sap nhap.', 'NQ/2025/QH15-22'),
	('24', NULL, NULL, '24', NULL, 'Hop nhat tinh Bac Giang (24) va tinh Bac Ninh (27) de hinh thanh tinh Bac Ninh moi.', 'NQ/2025/QH15-24'),
	('27', NULL, NULL, '24', NULL, 'Hop nhat tinh Bac Giang (24) va tinh Bac Ninh (27) de hinh thanh tinh Bac Ninh moi.', 'NQ/2025/QH15-24'),
	('17', NULL, NULL, '25', NULL, 'Hop nhat tinh Hoa Binh (17), tinh Phu Tho (25) va tinh Vinh Phuc (26) de hinh thanh tinh Phu Tho moi.', 'NQ/2025/QH15-25'),
	('25', NULL, NULL, '25', NULL, 'Hop nhat tinh Hoa Binh (17), tinh Phu Tho (25) va tinh Vinh Phuc (26) de hinh thanh tinh Phu Tho moi.', 'NQ/2025/QH15-25'),
	('26', NULL, NULL, '25', NULL, 'Hop nhat tinh Hoa Binh (17), tinh Phu Tho (25) va tinh Vinh Phuc (26) de hinh thanh tinh Phu Tho moi.', 'NQ/2025/QH15-25'),
	('30', NULL, NULL, '31', NULL, 'Sap nhap tinh Hai Duong (30) vao thanh pho Hai Phong (31) de hinh thanh don vi hanh chinh cap tinh moi.', 'NQ/2025/QH15-31'),
	('31', NULL, NULL, '31', NULL, 'Sap nhap tinh Hai Duong (30) vao thanh pho Hai Phong (31) de hinh thanh don vi hanh chinh cap tinh moi.', 'NQ/2025/QH15-31'),
	('33', NULL, NULL, '33', NULL, 'Hop nhat tinh Hung Yen (33) va tinh Thai Binh (34) de hinh thanh tinh Hung Yen moi.', 'NQ/2025/QH15-33'),
	('34', NULL, NULL, '33', NULL, 'Hop nhat tinh Hung Yen (33) va tinh Thai Binh (34) de hinh thanh tinh Hung Yen moi.', 'NQ/2025/QH15-33'),
	('35', NULL, NULL, '37', NULL, 'Hop nhat tinh Ha Nam (35), tinh Nam Dinh (36) va tinh Ninh Binh (37) de hinh thanh tinh Ninh Binh moi.', 'NQ/2025/QH15-37'),
	('36', NULL, NULL, '37', NULL, 'Hop nhat tinh Ha Nam (35), tinh Nam Dinh (36) va tinh Ninh Binh (37) de hinh thanh tinh Ninh Binh moi.', 'NQ/2025/QH15-37'),
	('37', NULL, NULL, '37', NULL, 'Hop nhat tinh Ha Nam (35), tinh Nam Dinh (36) va tinh Ninh Binh (37) de hinh thanh tinh Ninh Binh moi.', 'NQ/2025/QH15-37'),
	('38', NULL, NULL, '38', NULL, 'Tinh Thanh Hoa giu nguyen, khong sap nhap.', 'NQ/2025/QH15-38'),
	('40', NULL, NULL, '40', NULL, 'Tinh Nghe An giu nguyen, khong sap nhap.', 'NQ/2025/QH15-40'),
	('42', NULL, NULL, '42', NULL, 'Tinh Ha Tinh giu nguyen, khong sap nhap.', 'NQ/2025/QH15-42'),
	('44', NULL, NULL, '44', NULL, 'Hop nhat tinh Quang Binh (44) va tinh Quang Tri (45) de hinh thanh tinh Quang Tri moi.', 'NQ/2025/QH15-44'),
	('45', NULL, NULL, '44', NULL, 'Hop nhat tinh Quang Binh (44) va tinh Quang Tri (45) de hinh thanh tinh Quang Tri moi.', 'NQ/2025/QH15-44'),
	('46', NULL, NULL, '46', NULL, 'Thanh pho Hue giu nguyen, khong sap nhap.', 'NQ/2025/QH15-46'),
	('48', NULL, NULL, '48', NULL, 'Hop nhat tinh Quang Nam (49) vao thanh pho Da Nang (48) de hinh thanh don vi Da Nang moi.', 'NQ/2025/QH15-48'),
	('49', NULL, NULL, '48', NULL, 'Hop nhat tinh Quang Nam (49) vao thanh pho Da Nang (48) de hinh thanh don vi Da Nang moi.', 'NQ/2025/QH15-48'),
	('51', NULL, NULL, '51', NULL, 'Hop nhat tinh Kon Tum (62) va tinh Quang Ngai (51) de hinh thanh tinh Quang Ngai moi.', 'NQ/2025/QH15-51'),
	('62', NULL, NULL, '51', NULL, 'Hop nhat tinh Kon Tum (62) va tinh Quang Ngai (51) de hinh thanh tinh Quang Ngai moi.', 'NQ/2025/QH15-51'),
	('52', NULL, NULL, '52', NULL, 'Hop nhat tinh Binh Dinh (52) va tinh Gia Lai (64) de hinh thanh tinh Gia Lai moi.', 'NQ/2025/QH15-52'),
	('64', NULL, NULL, '52', NULL, 'Hop nhat tinh Binh Dinh (52) va tinh Gia Lai (64) de hinh thanh tinh Gia Lai moi.', 'NQ/2025/QH15-52'),
	('56', NULL, NULL, '56', NULL, 'Hop nhat tinh Ninh Thuan (58) vao tinh Khanh Hoa (56) de hinh thanh tinh Khanh Hoa moi.', 'NQ/2025/QH15-56'),
	('58', NULL, NULL, '56', NULL, 'Hop nhat tinh Ninh Thuan (58) vao tinh Khanh Hoa (56) de hinh thanh tinh Khanh Hoa moi.', 'NQ/2025/QH15-56'),
	('54', NULL, NULL, '66', NULL, 'Hop nhat tinh Phu Yen (54) vao tinh Dak Lak (66) de hinh thanh tinh Dak Lak moi.', 'NQ/2025/QH15-66'),
	('66', NULL, NULL, '66', NULL, 'Hop nhat tinh Phu Yen (54) vao tinh Dak Lak (66) de hinh thanh tinh Dak Lak moi.', 'NQ/2025/QH15-66'),
	('60', NULL, NULL, '68', NULL, 'Hop nhat tinh Binh Thuan (60) va tinh Dak Nong (67) vao tinh Lam Dong (68) de hinh thanh tinh Lam Dong moi.', 'NQ/2025/QH15-68'),
	('67', NULL, NULL, '68', NULL, 'Hop nhat tinh Binh Thuan (60) va tinh Dak Nong (67) vao tinh Lam Dong (68) de hinh thanh tinh Lam Dong moi.', 'NQ/2025/QH15-68'),
	('68', NULL, NULL, '68', NULL, 'Hop nhat tinh Binh Thuan (60) va tinh Dak Nong (67) vao tinh Lam Dong (68) de hinh thanh tinh Lam Dong moi.', 'NQ/2025/QH15-68'),
	('70', NULL, NULL, '75', NULL, 'Hop nhat tinh Binh Phuoc (70) vao tinh Dong Nai (75) de hinh thanh tinh Dong Nai moi.', 'NQ/2025/QH15-75'),
	('75', NULL, NULL, '75', NULL, 'Hop nhat tinh Binh Phuoc (70) vao tinh Dong Nai (75) de hinh thanh tinh Dong Nai moi.', 'NQ/2025/QH15-75'),
	('74', NULL, NULL, '79', NULL, 'Hop nhat tinh Ba Ria - Vung Tau (77) va tinh Binh Duong (74) vao thanh pho Ho Chi Minh (79).', 'NQ/2025/QH15-79'),
	('77', NULL, NULL, '79', NULL, 'Hop nhat tinh Ba Ria - Vung Tau (77) va tinh Binh Duong (74) vao thanh pho Ho Chi Minh (79).', 'NQ/2025/QH15-79'),
	('79', NULL, NULL, '79', NULL, 'Hop nhat tinh Ba Ria - Vung Tau (77) va tinh Binh Duong (74) vao thanh pho Ho Chi Minh (79).', 'NQ/2025/QH15-79'),
	('72', NULL, NULL, '80', NULL, 'Hop nhat tinh Tay Ninh (72) va tinh Long An (80) de hinh thanh tinh Tay Ninh moi.', 'NQ/2025/QH15-80'),
	('80', NULL, NULL, '80', NULL, 'Hop nhat tinh Tay Ninh (72) va tinh Long An (80) de hinh thanh tinh Tay Ninh moi.', 'NQ/2025/QH15-80'),
	('82', NULL, NULL, '82', NULL, 'Hop nhat tinh Tien Giang (82) va tinh Dong Thap (87) de hinh thanh tinh Dong Thap moi.', 'NQ/2025/QH15-82'),
	('87', NULL, NULL, '82', NULL, 'Hop nhat tinh Tien Giang (82) va tinh Dong Thap (87) de hinh thanh tinh Dong Thap moi.', 'NQ/2025/QH15-82'),
	('83', NULL, NULL, '86', NULL, 'Hop nhat tinh Ben Tre (83), tinh Tra Vinh (84) va tinh Vinh Long (86) de hinh thanh tinh Vinh Long moi.', 'NQ/2025/QH15-86'),
	('84', NULL, NULL, '86', NULL, 'Hop nhat tinh Ben Tre (83), tinh Tra Vinh (84) va tinh Vinh Long (86) de hinh thanh tinh Vinh Long moi.', 'NQ/2025/QH15-86'),
	('86', NULL, NULL, '86', NULL, 'Hop nhat tinh Ben Tre (83), tinh Tra Vinh (84) va tinh Vinh Long (86) de hinh thanh tinh Vinh Long moi.', 'NQ/2025/QH15-86'),
	('89', NULL, NULL, '91', NULL, 'Hop nhat tinh An Giang (89) va tinh Kien Giang (91) de hinh thanh tinh An Giang moi.', 'NQ/2025/QH15-91'),
	('91', NULL, NULL, '91', NULL, 'Hop nhat tinh An Giang (89) va tinh Kien Giang (91) de hinh thanh tinh An Giang moi.', 'NQ/2025/QH15-91'),
	('92', NULL, NULL, '92', NULL, 'Hop nhat thanh pho Can Tho (92) voi tinh Hau Giang (93) va tinh Soc Trang (94) de hinh thanh thanh pho Can Tho mo rong.', 'NQ/2025/QH15-92'),
	('93', NULL, NULL, '92', NULL, 'Hop nhat thanh pho Can Tho (92) voi tinh Hau Giang (93) va tinh Soc Trang (94) de hinh thanh thanh pho Can Tho mo rong.', 'NQ/2025/QH15-92'),
	('94', NULL, NULL, '92', NULL, 'Hop nhat thanh pho Can Tho (92) voi tinh Hau Giang (93) va tinh Soc Trang (94) de hinh thanh thanh pho Can Tho mo rong.', 'NQ/2025/QH15-92'),
	('95', NULL, NULL, '96', NULL, 'Hop nhat tinh Bac Lieu (95) vao tinh Ca Mau (96) de hinh thanh tinh Ca Mau moi.', 'NQ/2025/QH15-96'),
	('96', NULL, NULL, '96', NULL, 'Hop nhat tinh Bac Lieu (95) vao tinh Ca Mau (96) de hinh thanh tinh Ca Mau moi.', 'NQ/2025/QH15-96');

-- ---------------------------------------------------------------------------
-- Ward-level mappings (legacy wards,... -> reform wards)
-- ---------------------------------------------------------------------------
INSERT INTO vn_admin_unit_mappings (
	old_province_code,
	old_district_code,
	old_ward_code,
	new_province_code,
	new_commune_code,
	note,
	resolution_ref
)
VALUES
	('89', '886', '30337', '91', '30337', '1', 'An Phú'),
	('89', '886', '30370', '91', '30337', '1', 'An Phú'),
	('89', '886', '30355', '91', '30337', '1', 'An Phú'),
	('89', '886', '30358', '91', '30337', '1', 'An Phú'),
	('89', '886', '30373', '91', '30367', '2', 'Vĩnh Hậu'),
	('89', '886', '30367', '91', '30367', '2', 'Vĩnh Hậu'),
	('89', '886', '30364', '91', '30367', '2', 'Vĩnh Hậu'),
	('89', '886', '30346', '91', '30346', '3', 'Nhơn Hội'),
	('89', '886', '30349', '91', '30346', '3', 'Nhơn Hội'),
	('89', '886', '30355', '91', '30346', '3', 'Nhơn Hội'),
	('89', '886', '30355', '91', '30346', '3', 'Nhơn Hội'),
	('89', '886', '30341', '91', '30341', '4', 'Khánh Bình');	
	('89', '886', '30340', '91', '30341', '4', 'Khánh Bình'),
	('89', '886', '30341', '91', '30341', '4', 'Khánh Bình'),
	('89', '886', '30352', '91', '30352', '5', 'Phú Hữu'),
	('89', '886', '30361', '91', '30352', '5', 'Phú Hữu'),
	('89', '886', '30358', '91', '30352', '5', 'Phú Hữu'),


