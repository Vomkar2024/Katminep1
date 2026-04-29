-- 1. Setup Database
DROP DATABASE IF EXISTS ParkingSystem;
CREATE DATABASE IF NOT EXISTS ParkingSystem;
USE ParkingSystem;

-- 2. Create Tables
CREATE TABLE IF NOT EXISTS Companies (
    CompanyID INT PRIMARY KEY,
    CompanyName VARCHAR(50) NOT NULL,
    TotalSlots INT NOT NULL,
    OccupiedSlots INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS RFID_Tags (
    TagNumber INT PRIMARY KEY, -- 7-digit unique ID
    CompanyID INT DEFAULT NULL, 
    IsActive BOOLEAN DEFAULT TRUE, 
    IsParked BOOLEAN DEFAULT FALSE, 
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CompanyID) REFERENCES Companies (CompanyID)
);

CREATE TABLE IF NOT EXISTS ParkingLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    TagNumber INT,
    EntryGateID VARCHAR(50),
    ExitGateID VARCHAR(50) DEFAULT NULL,
    EntryTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    ExitTime DATETIME DEFAULT NULL,
    FOREIGN KEY (TagNumber) REFERENCES RFID_Tags (TagNumber)
);

CREATE TABLE IF NOT EXISTS Gates (
    GateID VARCHAR(50) PRIMARY KEY,
    IsActive BOOLEAN DEFAULT TRUE
);

INSERT INTO Gates (GateID, IsActive) VALUES ('GATE-01', TRUE), ('GATE-02', TRUE);

-- 3. Insert 2 Companies with 10 slots each
INSERT INTO Companies (CompanyID, CompanyName, TotalSlots, OccupiedSlots)
VALUES 
    (1, 'Company A', 10, 0),
    (2, 'Company B', 10, 0);

-- 4. Insert 20 RFID Tokens (10 per Company)
-- These represent your CSV sheet data mapped to the slots
INSERT INTO RFID_Tags (TagNumber, CompanyID, IsActive, IsParked)
VALUES 
    -- Company A (Slots 1-10)
    (4820193, 1, 1, 0), (7153042, 1, 1, 0), (2094857, 1, 1, 0), (6381029, 1, 1, 0), (8527410, 1, 1, 0),
    (1739504, 1, 1, 0), (5048263, 1, 1, 0), (9210576, 1, 1, 0), (3672148, 1, 1, 0), (5941032, 1, 1, 0),
    
    -- Company B (Slots 11-20)
    (3902184, 2, 1, 0), (8274056, 2, 1, 0), (1563920, 2, 1, 0), (9403271, 2, 1, 0), (5182937, 2, 1, 0),
    (2640581, 2, 1, 0), (7391045, 2, 1, 0), (6825139, 2, 1, 0), (4059283, 2, 1, 0), (8173642, 2, 1, 0);

-- 5. Final Report
-- Verify that each company has exactly 10 tags assigned
SELECT 
    C.CompanyName, 
    COUNT(R.TagNumber) AS TagsAssigned,
    C.TotalSlots,
    (C.TotalSlots - C.OccupiedSlots) AS AvailableSpaces
FROM Companies C
LEFT JOIN RFID_Tags R ON C.CompanyID = R.CompanyID
GROUP BY C.CompanyID;

-- View the full list of tags and their assigned companies
SELECT TagNumber, CompanyID FROM RFID_Tags ORDER BY CompanyID, TagNumber;