import React from 'react';
import api from './api';

const VehicleCard = ({ vehicle }) => {
    // 1. This is our Rule Book (The Transitions) [cite: 98]
    const allowedTransitions = {
        'IDLE': ['ACTIVE'],
        'ACTIVE': ['MAINTENANCE', 'IDLE'],
        'MAINTENANCE': ['IDLE'],
        'RETIRED': [] // Once it's retired, it's finished!
    };

    // 2. This is the "Change Status" Action
    const handleChangeStatus = async (newStatus) => {
        const currentStatus = vehicle.status;

        // The 5-year-old Check: "Are you allowed to do that?" 
        if (!allowedTransitions[currentStatus].includes(newStatus)) {
            alert(`Stop! You can't go from ${currentStatus} to ${newStatus}. 
            The only things you can do next are: ${allowedTransitions[currentStatus].join(', ')}`);
            return; // This "return" means: STOP here, don't talk to the database!
        }

        // If the check passes, we tell the Backend to update the Filing Cabinet
        try {
            await api.patch(`/vehicles/${vehicle.id}/status`, { status: newStatus });
            alert("Success! The truck is now " + newStatus);
            window.location.reload(); // Refresh to show the new status
        } catch (err) {
            alert("The computer had a problem: " + err.message);
        }
    };

    return (
        <div style={{ border: '1px solid black', margin: '10px', padding: '10px' }}>
            <h4>Truck: {vehicle.license_plate}</h4>
            <p>Current Status: <b>{vehicle.status}</b></p>
            
            {/* These are the buttons the user clicks */}
            <button onClick={() => handleChangeStatus('ACTIVE')}>Set to ACTIVE</button>
            <button onClick={() => handleChangeStatus('MAINTENANCE')}>Set to MAINTENANCE</button>
            <button onClick={() => handleChangeStatus('IDLE')}>Set to IDLE</button>
        </div>
    );
};

export default VehicleCard;