import React, { useState, useEffect } from 'react';
import api from './api';

const AlertPanel = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchAlerts = async () => {
            const res = await api.get('/alerts');
            setAlerts(res.data);
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '10px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
            <h3>⚠️ System Alerts</h3>
            {alerts.map((alert, index) => (
                <div key={index} style={{
                    padding: '10px',
                    margin: '5px 0',
                    color: 'white',
                    borderRadius: '4px',
                    // Requirement 109: Color Coding
                    backgroundColor: alert.severity === 'CRITICAL' ? '#d9534f' : '#f0ad4e' 
                }}>
                    <strong>[{alert.severity}]</strong> {alert.message}
                </div>
            ))}
        </div>
    );
};

export default AlertPanel;