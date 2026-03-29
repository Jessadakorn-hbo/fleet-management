import React, { useState } from 'react';
import api from './api';

const TripTracker = ({ tripId, checkpoints }) => {
    const [steps, setSteps] = useState(checkpoints);

    const updateCheckpoint = async (id, newStatus) => {
        const originalSteps = [...steps];
        
        // Optimistic Update: Change color immediately (Requirement 101)
        setSteps(steps.map(s => s.id === id ? { ...s, status: newStatus } : s));

        try {
            // Simulate a random delay (300-800ms) and 30% fail rate 
            await new Promise((resolve, reject) => {
                const delay = Math.random() * (800 - 300) + 300;
                setTimeout(() => Math.random() > 0.3 ? resolve() : reject(), delay);
            });

            await api.patch(`/checkpoints/${id}/status`, { status: newStatus });
        } catch (err) {
            // Rollback: If it failed, put the old colors back! 
            alert("Update failed! Try again.");
            setSteps(originalSteps);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
            {steps.map((cp, index) => (
                <div key={cp.id} style={{ textAlign: 'center' }}>
                    {/* Visual Color Coding  */}
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: cp.status === 'DEPARTED' ? 'green' : cp.status === 'ARRIVED' ? 'yellow' : 'gray'
                    }}>
                        {index + 1}
                    </div>
                    <p>{cp.location_name}</p>
                    <small>{cp.purpose}</small>
                    <br />
                    <button onClick={() => updateCheckpoint(cp.id, 'ARRIVED')}>Arrived</button>
                    <button onClick={() => updateCheckpoint(cp.id, 'DEPARTED')}>Departed</button>
                </div>
            ))}
        </div>
    );
};

export default TripTracker;