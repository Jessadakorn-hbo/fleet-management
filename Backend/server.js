const express = require('express');
const mysql = require('mysql2/promise'); // Note: Added /promise
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 1. Database Setup (The Filing Cabinet)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'password123',
    database: process.env.DB_NAME || 'fleet_db'
});

const ACCESS_SECRET = 'my_super_secret_access_key';
const REFRESH_SECRET = 'my_super_secret_refresh_key';

// 2. Requirement 5.3: Audit Log Middleware (The "Security Camera")
// This records every move someone makes in a table that can't be deleted!
const auditLog = (action, resourceType) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const userId = req.user?.id || 'SYSTEM';
                db.query(
                    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?)',
                    [userId, action, resourceType, req.params.id || req.body.id || null]
                ).catch(err => console.error("Audit log failed", err));
            }
            originalSend.call(this, body);
        };
        next();
    };
};

// 3. Requirement 1.2: The Guard Middleware
const protect = (roles = []) => {
    return async (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Please log in" } });

        try {
            const decoded = jwt.verify(token, ACCESS_SECRET);
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access Denied" } });
            }
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Token expired" } });
        }
    };
};

// --- AUTH ROUTES ---
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!users.length || !(await bcrypt.compare(password, users[0].password))) {
        return res.status(401).json({ error: { code: "AUTH_FAILED", message: "Invalid credentials" } });
    }
    const accessToken = jwt.sign({ id: users[0].id, role: users[0].role }, ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: users[0].id, role: users[0].role }, REFRESH_SECRET, { expiresIn: '7d' });
    res.json({ accessToken, refreshToken });
});

// --- VEHICLE ROUTES ---
app.post('/vehicles', protect(['ADMIN']), auditLog('CREATE', 'VEHICLE'), async (req, res) => {
    const { id, license_plate, type, context } = req.body;
    try {
        await db.query(
            'INSERT INTO vehicles (id, license_plate, type, brand, model, next_service_km) VALUES (?, ?, ?, ?, ?, ?)',
            [id, license_plate, type, context?.brand, context?.model, context?.next_service_km || 10000]
        );
        res.status(201).json({ message: "Vehicle added" });
    } catch (err) {
        res.status(500).json({ error: { code: "DB_ERR", message: err.message } });
    }
});

// --- TRIP ROUTES (Requirement 3.1 & 3.2) ---
app.post('/trips', protect(['DISPATCHER']), auditLog('CREATE', 'TRIP'), async (req, res) => {
    const { id, vehicle_id, driver_id, origin, destination, distance_km } = req.body;
    
    // Check if vehicle is busy
    const [busy] = await db.query("SELECT id FROM trips WHERE vehicle_id = ? AND status = 'IN_PROGRESS'", [vehicle_id]);
    if (busy.length) return res.status(400).json({ error: { code: "BUSY", message: "Vehicle busy" } });

    await db.query(
        'INSERT INTO trips (id, vehicle_id, driver_id, origin, destination, distance_km, status) VALUES (?, ?, ?, ?, ?, ?, "IN_PROGRESS")',
        [id, vehicle_id, driver_id, origin, destination, distance_km]
    );
    res.json({ message: "Trip started" });
});

app.patch('/checkpoints/:id/status', protect(['DISPATCHER']), async (req, res) => {
    const { status } = req.body;
    const [current] = await db.query('SELECT * FROM checkpoints WHERE id = ?', [req.params.id]);
    
    // Requirement 3.2: Sequence Check
    if (current[0].sequence > 1) {
        const [prev] = await db.query('SELECT status FROM checkpoints WHERE trip_id = ? AND sequence = ?', [current[0].trip_id, current[0].sequence - 1]);
        if (prev[0].status !== 'DEPARTED') {
            return res.status(400).json({ error: { code: "SEQ_ERR", message: "Previous stop not finished" } });
        }
    }
    await db.query('UPDATE checkpoints SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: "Checkpoint updated" });
});

// A simple "Welcome" route so the browser doesn't show an error
app.get('/', (req, res) => {
    res.send('Fleet Management API is Running! Go to localhost:3000 for the Frontend.');
});

app.listen(5000, () => console.log('Server running on 5000'));

// Requirement 4.1: The Rule Handbook
const alertRules = [
    {
        name: "Vehicle Due for Service",
        severity: "CRITICAL",
        check: async () => {
            const [rows] = await db.query("SELECT id, license_plate FROM vehicles WHERE mileage_km >= next_service_km");
            return rows.map(r => ({ resource_id: r.id, resource_type: 'VEHICLE', message: `Vehicle ${r.license_plate} is due for service` }));
        }
    },
    {
        name: "License Expiring Soon",
        severity: "WARNING",
        check: async () => {
            const [rows] = await db.query("SELECT id, full_name FROM drivers WHERE license_expiry <= DATE_ADD(NOW(), INTERVAL 30 DAY)");
            return rows.map(r => ({ resource_id: r.id, resource_type: 'DRIVER', message: `Driver ${r.full_name} license expires within 30 days` }));
        }
    },
    {
        name: "Overdue Maintenance",
        severity: "CRITICAL",
        check: async () => {
            const [rows] = await db.query("SELECT id, vehicle_id FROM maintenance WHERE status = 'SCHEDULED' AND scheduled_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)");
            return rows.map(r => ({ resource_id: r.vehicle_id, resource_type: 'MAINTENANCE', message: `Maintenance ${r.id} is overdue by 3+ days` }));
        }
    }
];

// Requirement 4.2: GET /alerts
app.get('/alerts', protect(['DISPATCHER', 'ADMIN']), async (req, res) => {
    let allAlerts = [];
    
    // Run every rule in the handbook
    for (const rule of alertRules) {
        const triggers = await rule.check();
        const formatted = triggers.map(t => ({ ...t, severity: rule.severity }));
        allAlerts = [...allAlerts, ...formatted];
    }

    // Filter by type or severity if requested (Requirement 108)
    const { severity, resource_type } = req.query;
    if (severity) allAlerts = allAlerts.filter(a => a.severity === severity);
    if (resource_type) allAlerts = allAlerts.filter(a => a.resource_type === resource_type);

    res.json(allAlerts);
});

app.get('/dashboard/metrics', protect(['DISPATCHER', 'ADMIN']), async (req, res) => {
    const [vehicles] = await db.query("SELECT COUNT(*) as total FROM vehicles");
    const [trips] = await db.query("SELECT COUNT(*) as total FROM trips WHERE status = 'IN_PROGRESS'");
    const [overdue] = await db.query("SELECT COUNT(*) as total FROM maintenance WHERE status = 'OVERDUE'");
    
    res.json({
        totalVehicles: vehicles[0].total,
        activeTrips: trips[0].total,
        maintenanceOverdue: overdue[0].total
    });
});
app.get('/audit-logs', protect(['ADMIN', 'DISPATCHER']), async (req, res) => {
    let query = "SELECT * FROM audit_logs";
    let params = [];

    // Requirement 5.4: Dispatcher can only see their own logs
    if (req.user.role === 'DISPATCHER') {
        query += " WHERE user_id = ?";
        params.push(req.user.id);
    }

    const [logs] = await db.query(query + " ORDER BY created_at DESC", params);
    res.json(logs);
});