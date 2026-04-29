import sqlite3
import random

class ParkingSystem:
    def __init__(self):
        # Initialize Database
        self.conn = sqlite3.connect(':memory:') # Use ':memory:' for demo, 'parking.db' for persistence
        self.cursor = self.conn.cursor()
        self._setup_db()
        
    def _setup_db(self):
        # Create Tables
        self.cursor.execute('CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT, capacity INTEGER)')
        self.cursor.execute('''CREATE TABLE tags (
                                rfid_tag TEXT PRIMARY KEY, 
                                company_id INTEGER, 
                                is_occupied INTEGER DEFAULT 0,
                                FOREIGN KEY(company_id) REFERENCES companies(id))''')
        
        # Insert Company Data
        capacities = [10, 30, 40, 50, 20]
        used_tags = set()

        for i, cap in enumerate(capacities, 1):
            self.cursor.execute('INSERT INTO companies VALUES (?, ?, ?)', (i, f"Company {i}", cap))
            
            # Generate unique 8-digit tags for each slot
            for _ in range(cap):
                while True:
                    tag = str(random.randint(10000000, 99999999))
                    if tag not in used_tags:
                        used_tags.add(tag)
                        break
                self.cursor.execute('INSERT INTO tags (rfid_tag, company_id) VALUES (?, ?)', (tag, i))
        self.conn.commit()

    def scan_rfid(self, tag_id, action):
        """Simulates a scan at Entrance (In) or Exit (Out)"""
        # Check if tag exists
        self.cursor.execute('SELECT company_id, is_occupied FROM tags WHERE rfid_tag = ?', (tag_id,))
        result = self.cursor.fetchone()
        
        if not result:
            return "Invalid Tag!"

        comp_id, is_occupied = result
        
        if action == "IN":
            if is_occupied == 1: return "Error: Vehicle already inside."
            self.cursor.execute('UPDATE tags SET is_occupied = 1 WHERE rfid_tag = ?', (tag_id,))
        elif action == "OUT":
            if is_occupied == 0: return "Error: Vehicle already outside."
            self.cursor.execute('UPDATE tags SET is_occupied = 0 WHERE rfid_tag = ?', (tag_id,))
        
        self.conn.commit()
        return self.display_dashboard(comp_id)

    def display_dashboard(self, comp_id):
        """Returns the current state of a specific company's parking"""
        self.cursor.execute('SELECT capacity FROM companies WHERE id = ?', (comp_id,))
        total = self.cursor.fetchone()[0]
        
        self.cursor.execute('SELECT COUNT(*) FROM tags WHERE company_id = ? AND is_occupied = 1', (comp_id,))
        occupied = self.cursor.fetchone()[0]
        
        free = total - occupied
        return f"Company {comp_id} Dashboard | Occupied: {occupied} | Free: {free}"

    def get_sample_tag(self, comp_id):
        """Helper to grab a valid tag for testing"""
        self.cursor.execute('SELECT rfid_tag FROM tags WHERE company_id = ? LIMIT 1', (comp_id,))
        return self.cursor.fetchone()[0]

# --- Execution ---
park = ParkingSystem()

# Let's simulate Company 1 (Capacity 10)
test_tag = park.get_sample_tag(1)
print(f"Initial Scan (Entry) for Tag {test_tag}:")
print(park.scan_rfid(test_tag, "IN"))

print("\nSecond Scan (Exit) for same tag:")
print(park.scan_rfid(test_tag, "OUT"))