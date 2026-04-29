-- 1. COMPLETE PURGE (The "Nuclear" Option)
-- This deletes the database and all its hidden metadata
DROP DATABASE IF EXISTS parkingsystem;
CREATE DATABASE parkingsystem;
USE parkingsystem;

-- 2. CREATE COMPANIES (Parent)
CREATE TABLE companies (
    company_id INT NOT NULL AUTO_INCREMENT,
    company_name VARCHAR(50) NOT NULL,
    total_slots INT NOT NULL,
    occupied_slots INT DEFAULT 0,
    PRIMARY KEY (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. CREATE PARKING_TAGS (Child)
CREATE TABLE parking_tags (
    tag_number INT NOT NULL,
    company_id INT NOT NULL,
    is_parked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (tag_number),
    CONSTRAINT fk_company_id 
        FOREIGN KEY (company_id) 
        REFERENCES companies (company_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. CREATE PARKING_LOGS (Grandchild)
CREATE TABLE parking_logs (
    log_id INT NOT NULL AUTO_INCREMENT,
    tag_number INT NOT NULL,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_time DATETIME NULL,
    PRIMARY KEY (log_id),
    CONSTRAINT fk_tag_number 
        FOREIGN KEY (tag_number) 
        REFERENCES parking_tags (tag_number) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. RE-INSERT DATA
INSERT INTO companies (company_id, company_name, total_slots) VALUES
(1, 'Company 1', 10), (2, 'Company 2', 30), (3, 'Company 3', 40), (4, 'Company 4', 50), (5, 'Company 5', 20);

INSERT INTO parking_tags (tag_number, company_id) VALUES
(10293847, 1), (84729103, 1), (39184752, 1),
(57281934, 2), (91827365, 2), (28374659, 2);


