CREATE DATABASE IF NOT EXISTS ParkingSystem;

USE ParkingSystem;

CREATE TABLE IF NOT EXISTS Companies (
    CompanyID INT PRIMARY KEY,
    CompanyName VARCHAR(50),
    TotalSlots INT NOT NULL CHECK (TotalSlots > 0),
    OccupiedSlots INT DEFAULT 0 CHECK (OccupiedSlots >= 0)
);

CREATE INDEX idx_occupied ON Companies(CompanyID);

CREATE TABLE IF NOT EXISTS RFID_Tags (
    TagNumber INT PRIMARY KEY,
    CompanyID INT DEFAULT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    IsParked BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CompanyID) REFERENCES Companies (CompanyID)
);

CREATE INDEX idx_company ON RFID_Tags(CompanyID);
CREATE INDEX idx_parked ON RFID_Tags(IsParked);

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

CREATE INDEX idx_tag_exit ON ParkingLogs(TagNumber, ExitTime);
CREATE INDEX idx_entry_time ON ParkingLogs(EntryTime);

-- Initial companies can be inserted manually or via API
-- Example:
-- INSERT INTO Companies (CompanyID, CompanyName, TotalSlots, OccupiedSlots) VALUES (1, 'Company 1', 10, 0);