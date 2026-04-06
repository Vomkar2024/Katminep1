CREATE DATABASE IF NOT EXISTS ParkingSystem;

USE ParkingSystem;

CREATE TABLE IF NOT EXISTS Companies (
    CompanyID INT PRIMARY KEY,
    CompanyName VARCHAR(50),
    TotalSlots INT,
    OccupiedSlots INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS RFID_Tags (
    TagNumber INT PRIMARY KEY, -- 8-digit unique ID
    CompanyID INT DEFAULT NULL, -- Links to Companies
    IsActive BOOLEAN DEFAULT TRUE, -- Tag validation status
    IsParked BOOLEAN DEFAULT FALSE, -- Tracks if the car is currently inside
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CompanyID) REFERENCES Companies (CompanyID)
);

CREATE TABLE IF NOT EXISTS ParkingLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    TagNumber INT,
    GateID VARCHAR(50),
    EntryTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    ExitTime DATETIME DEFAULT NULL,
    FOREIGN KEY (TagNumber) REFERENCES RFID_Tags (TagNumber)
);

-- 5. Insert the 5 Companies and their capacities
INSERT IGNORE INTO
    Companies (
        CompanyID,
        CompanyName,
        TotalSlots,
        OccupiedSlots
    )
VALUES (1, 'Company 1', 10, 0),
    (2, 'Company 2', 30, 0),
    (3, 'Company 3', 40, 0),
    (4, 'Company 4', 50, 0),
    (5, 'Company 5', 20, 0);

SELECT R.TagNumber, C.CompanyName, C.TotalSlots, C.OccupiedSlots, (
        C.TotalSlots - C.OccupiedSlots
    ) AS FreeSpaces
FROM RFID_Tags R
    JOIN Companies C ON R.CompanyID = C.CompanyID;