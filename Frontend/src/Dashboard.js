import React, { useEffect, useState } from 'react';
import { Pie, Line } from 'react-chartjs-2';
import api from './api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const Dashboard = () => {
    const [metrics, setMetrics] = useState({});

    useEffect(() => {
        api.get('/dashboard/metrics').then(res => setMetrics(res.data));
    }, []);

    // Requirement 5.2: Pie Chart Data (Vehicles by Status)
    const pieData = {
        labels: ['Active', 'Idle', 'Maintenance'],
        datasets: [{
            data: [metrics.activeTrips, 5, metrics.maintenanceOverdue], // Replace 5 with real IDLE count
            backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
        }]
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Fleet Dashboard</h2>
            {/* Requirement 5.1: Metric Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div className="card">Total Vehicles: {metrics.totalVehicles}</div>
                <div className="card">Active Trips: {metrics.activeTrips}</div>
                <div className="card" style={{ color: 'red' }}>Overdue: {metrics.maintenanceOverdue}</div>
            </div>

            <div style={{ width: '400px' }}>
                <h3>Vehicle Status Distribution</h3>
                <Pie data={pieData} />
            </div>
        </div>
    );
};

export default Dashboard;