import React, { useState } from 'react';

const TripForm = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        vehicle_id: '',
        driver_id: '',
        origin: '',
        destination: '',
        cargo_type: 'GENERAL',
        checkpoints: []
    });

    // This makes sure we don't lose data when clicking "Back" 
    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div style={{ padding: '20px', border: '2px solid blue' }}>
            <h2>Create New Trip (Step {step} of 3)</h2>
            
            {step === 1 && <StepOne data={formData} setData={setFormData} next={nextStep} />}
            {step === 2 && <StepTwo data={formData} setData={setFormData} next={nextStep} back={prevStep} />}
            {step === 3 && <StepThree data={formData} setData={setFormData} back={prevStep} />}
        </div>
    );
};

const StepOne = ({ data, setData, next }) => {
    const validate = () => {
        if (!data.vehicle_id || !data.driver_id) {
            alert("You must pick a truck and a driver!");
            return;
        }
        next();
    };

    return (
        <div>
            <label>Select Vehicle ID:</label>
            <input 
                value={data.vehicle_id} 
                onChange={e => setData({...data, vehicle_id: e.target.value})} 
                placeholder="veh_001" 
            />
            <br />
            <label>Select Driver ID:</label>
            <input 
                value={data.driver_id} 
                onChange={e => setData({...data, driver_id: e.target.value})} 
                placeholder="drv_001" 
            />
            <br />
            <button onClick={validate}>Next: Route Info</button>
        </div>
    );
};

const StepTwo = ({ data, setData, next, back }) => {
    return (
        <div>
            <input placeholder="Origin" value={data.origin} onChange={e => setData({...data, origin: e.target.value})} />
            <input placeholder="Destination" value={data.destination} onChange={e => setData({...data, destination: e.target.value})} />
            <select value={data.cargo_type} onChange={e => setData({...data, cargo_type: e.target.value})}>
                <option value="GENERAL">General</option>
                <option value="FRAGILE">Fragile</option>
                <option value="HAZARDOUS">Hazardous</option>
            </select>
            <br />
            <button onClick={back}>Back</button>
            <button onClick={next}>Next: Checkpoints</button>
        </div>
    );
};