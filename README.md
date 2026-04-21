# Katminep1 - RFID Parking Management System

## Setup

```bash
npm install
npm start
```

## Database Initialization

```bash
mysql -u root -p < mysql.sql
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `PARKING_API_KEY` | `parking-secret-key-2026` | API key for authentication |

## API Endpoints

### Gate Control
- `POST /gate/entry` - Vehicle entry (body: `{tag, gateId}`)
- `POST /gate/exit` - Vehicle exit (body: `{tag, gateId}`)

### Capacity (Public - no auth required)
- `GET /capacity` - All companies capacity
- `GET /company/:id/capacity` - Single company capacity

### Company Management (Auth required)
- `GET /companies` - List all companies
- `POST /companies` - Create company (body: `{companyId, companyName, totalSlots}`)
- `PUT /companies/:id` - Update capacity (body: `{totalSlots}`)
- `DELETE /companies/:id` - Delete company

### Authentication
Send header: `X-API-Key: <key>` or `Authorization: Bearer <key>`

## Default Gates
- `GATE-01` - Main Entry (both)
- `GATE-02` - Side Entry (both)
- `GATE-03` - Emergency (exit)