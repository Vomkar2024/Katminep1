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

CREATE TABLE IF NOT EXISTS Gates (
    GateID VARCHAR(50) PRIMARY KEY,
    GateName VARCHAR(100),
    GateType ENUM('entry', 'exit', 'both') DEFAULT 'both',
    IsActive BOOLEAN DEFAULT TRUE
);

-- Insert default gates
INSERT IGNORE INTO Gates (GateID, GateName, GateType) VALUES
    ('GATE-01', 'Main Entry', 'both'),
    ('GATE-02', 'Side Entry', 'both'),
    ('GATE-03', 'Emergency', 'exit');

CREATE TABLE IF NOT EXISTS ParkingLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    TagNumber INT,
    GateID VARCHAR(50),
    EntryTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    ExitTime DATETIME DEFAULT NULL,
    FOREIGN KEY (TagNumber) REFERENCES RFID_Tags (TagNumber),
    FOREIGN KEY (GateID) REFERENCES Gates (GateID)
);

-- Initial companies can be inserted manually or via API
-- Example:
-- INSERT INTO Companies (CompanyID, CompanyName, TotalSlots, OccupiedSlots) VALUES (1, 'Company 1', 10, 0);

SELECT R.TagNumber, C.CompanyName, C.TotalSlots, C.OccupiedSlots, (
        C.TotalSlots - C.OccupiedSlots
    ) AS FreeSpaces
FROM RFID_Tags R
    JOIN Companies C ON R.CompanyID = C.CompanyID;