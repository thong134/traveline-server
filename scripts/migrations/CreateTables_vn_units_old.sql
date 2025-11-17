CREATE SCHEMA IF NOT EXISTS vn_legacy;
SET search_path TO vn_legacy;

-- CREATE administrative_regions TABLE
CREATE TABLE administrative_regions (
	id integer NOT NULL,
	"name" varchar(255) NOT NULL,
	name_en varchar(255) NOT NULL,
	code_name varchar(255) NULL,
	code_name_en varchar(255) NULL,
	CONSTRAINT administrative_regions_prkey PRIMARY KEY (id)
);

-- CREATE administrative_units TABLE
CREATE TABLE administrative_units_old (
	id integer NOT NULL,
	full_name varchar(255) NULL,
	full_name_en varchar(255) NULL,
	short_name varchar(255) NULL,
	short_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	code_name_en varchar(255) NULL,
	CONSTRAINT administrative_units_prkey PRIMARY KEY (id)
);

-- CREATE provinces TABLE
CREATE TABLE provinces (
	code varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	name_en varchar(255) NULL,
	full_name varchar(255) NOT NULL,
	full_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	administrative_unit_id integer NULL,
	administrative_region_id integer NULL,
	CONSTRAINT provinces_prkey PRIMARY KEY (code)
);


-- provinces foreign keys

ALTER TABLE provinces ADD CONSTRAINT provinces_administrative_region_id_frkey FOREIGN KEY (administrative_region_id) REFERENCES administrative_regions(id);
ALTER TABLE provinces ADD CONSTRAINT provinces_administrative_unit_id_frkey FOREIGN KEY (administrative_unit_id) REFERENCES administrative_units_old(id);

CREATE INDEX index_provinces_region ON provinces(administrative_region_id);
CREATE INDEX index_provinces_unit ON provinces(administrative_unit_id);


-- CREATE districts TABLE
CREATE TABLE districts (
	code varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	name_en varchar(255) NULL,
	full_name varchar(255) NULL,
	full_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	province_code varchar(20) NULL,
	administrative_unit_id integer NULL,
	CONSTRAINT districts_prkey PRIMARY KEY (code)
);


-- districts foreign keys

ALTER TABLE districts ADD CONSTRAINT districts_administrative_unit_id_frkey FOREIGN KEY (administrative_unit_id) REFERENCES administrative_units_old(id);
ALTER TABLE districts ADD CONSTRAINT districts_province_code_frkey FOREIGN KEY (province_code) REFERENCES provinces(code);

CREATE INDEX index_districts_province ON districts(province_code);
CREATE INDEX index_districts_unit ON districts(administrative_unit_id);



-- CREATE wards TABLE
CREATE TABLE wards (
	code varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	name_en varchar(255) NULL,
	full_name varchar(255) NULL,
	full_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	district_code varchar(20) NULL,
	administrative_unit_id integer NULL,
	CONSTRAINT wards_prkey PRIMARY KEY (code)
);


-- wards foreign keys

ALTER TABLE wards ADD CONSTRAINT wards_administrative_unit_id_frkey FOREIGN KEY (administrative_unit_id) REFERENCES administrative_units_old(id);
ALTER TABLE wards ADD CONSTRAINT wards_district_code_frkey FOREIGN KEY (district_code) REFERENCES districts(code);

CREATE INDEX index_wards_district ON wards(district_code);
CREATE INDEX index_wards_unit ON wards(administrative_unit_id);

RESET search_path;