import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/api';
import { useToast } from '../shared/Toast';
import StepperProgress from './StepperProgress';
import { validateCoordinates, validateDirections, validateFilename, validateDriveLink, validateFullPayload } from './submitValidation';

const STEPS = ['Network', 'Source', 'Destination', 'Route Details', 'Drive Links', 'Summary'];

const INITIAL_DATA = {
    network_name: '',
    source_location_name: '',
    source_takeoff_zone_name: '',
    source_latitude: '',
    source_longitude: '',
    destination_location_name: '',
    destination_landing_zone_name: '',
    destination_latitude: '',
    destination_longitude: '',
    takeoff_direction: '',
    approach_direction: '',
    mission_filename: '',
    mission_drive_link: '',
    elevation_image_drive_link: '',
    route_image_drive_link: '',
};

export default function NewRouteStepper() {
    const navigate = useNavigate();
    const addToast = useToast();
    const [step, setStep] = useState(1);
    const [data, setData] = useState(INITIAL_DATA);
    const [networks, setNetworks] = useState([]);
    const [loadingNetworks, setLoadingNetworks] = useState(true);
    const [stepErrors, setStepErrors] = useState([]);
    const [stepWarnings, setStepWarnings] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [validating, setValidating] = useState(false);
    const [serverValidation, setServerValidation] = useState(null);
    const [duplicateCheck, setDuplicateCheck] = useState(null);

    useEffect(() => {
        api.getNetworks()
            .then(setNetworks)
            .catch(e => addToast(`Failed to load networks: ${e.message}`))
            .finally(() => setLoadingNetworks(false));
    }, []);

    const update = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        setStepErrors([]);
        setStepWarnings([]);
    };

    const numVal = (field) => {
        const v = data[field];
        return v === '' || v === null || v === undefined ? 0 : Number(v);
    };

    const validateCurrentStep = () => {
        const errors = [];
        const warnings = [];

        switch (step) {
            case 1:
                if (!data.network_name) errors.push('Please select a network');
                break;
            case 2: {
                if (!data.source_location_name.trim()) errors.push('Source location name is required');
                if (!data.source_takeoff_zone_name.trim()) errors.push('Source takeoff zone name is required');
                const c = validateCoordinates(numVal('source_latitude'), numVal('source_longitude'), 'Source');
                errors.push(...c.errors);
                warnings.push(...c.warnings);
                if (!data.source_latitude && data.source_latitude !== 0) errors.push('Source latitude is required');
                if (!data.source_longitude && data.source_longitude !== 0) errors.push('Source longitude is required');
                break;
            }
            case 3: {
                if (!data.destination_location_name.trim()) errors.push('Destination location name is required');
                if (!data.destination_landing_zone_name.trim()) errors.push('Destination landing zone name is required');
                const c = validateCoordinates(numVal('destination_latitude'), numVal('destination_longitude'), 'Destination');
                errors.push(...c.errors);
                warnings.push(...c.warnings);
                if (!data.destination_latitude && data.destination_latitude !== 0) errors.push('Destination latitude is required');
                if (!data.destination_longitude && data.destination_longitude !== 0) errors.push('Destination longitude is required');
                break;
            }
            case 4: {
                if (data.takeoff_direction === '' || data.takeoff_direction === null) errors.push('Takeoff direction is required');
                if (data.approach_direction === '' || data.approach_direction === null) errors.push('Approach direction is required');
                const fn = validateFilename(data.mission_filename);
                errors.push(...fn.errors);
                if (data.takeoff_direction !== '' && data.approach_direction !== '') {
                    const d = validateDirections(numVal('takeoff_direction'), numVal('approach_direction'));
                    warnings.push(...d.warnings);
                }
                break;
            }
            case 5: {
                const m = validateDriveLink(data.mission_drive_link, 'Mission file', true);
                errors.push(...m.errors);
                const e = validateDriveLink(data.elevation_image_drive_link, 'Elevation image', false);
                errors.push(...e.errors);
                const r = validateDriveLink(data.route_image_drive_link, 'Route image', false);
                errors.push(...r.errors);
                break;
            }
        }

        setStepErrors(errors);
        setStepWarnings(warnings);
        return errors.length === 0;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setStepErrors([]);
            setStepWarnings([]);
            setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        setStepErrors([]);
        setStepWarnings([]);
        setStep(s => s - 1);
    };

    const buildPayload = () => ({
        network_name: data.network_name,
        source_location_name: data.source_location_name,
        source_takeoff_zone_name: data.source_takeoff_zone_name,
        source_latitude: numVal('source_latitude'),
        source_longitude: numVal('source_longitude'),
        destination_location_name: data.destination_location_name,
        destination_landing_zone_name: data.destination_landing_zone_name,
        destination_latitude: numVal('destination_latitude'),
        destination_longitude: numVal('destination_longitude'),
        takeoff_direction: numVal('takeoff_direction'),
        approach_direction: numVal('approach_direction'),
        mission_filename: data.mission_filename,
        mission_drive_link: data.mission_drive_link,
        elevation_image_drive_link: data.elevation_image_drive_link || '',
        route_image_drive_link: data.route_image_drive_link || '',
    });

    const runServerValidation = async () => {
        setValidating(true);
        setServerValidation(null);
        setDuplicateCheck(null);
        try {
            const payload = buildPayload();
            const [valResult, dupResult] = await Promise.all([
                api.validateSubmission(payload),
                api.checkDuplicate(payload),
            ]);
            setServerValidation(valResult);
            setDuplicateCheck(dupResult);
        } catch (e) {
            addToast(`Validation failed: ${e.message}`);
        } finally {
            setValidating(false);
        }
    };

    // Run server validation when entering summary step
    useEffect(() => {
        if (step === 6) runServerValidation();
    }, [step]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = buildPayload();
            const result = await api.createSubmission(payload);
            addToast(`Submission created: #${result.submission_id.slice(0, 8)}`);
            navigate('/');
        } catch (e) {
            addToast(`Submit failed: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = serverValidation?.is_valid &&
        !duplicateCheck?.is_exact_duplicate &&
        !submitting;

    return (
        <div className="stepper-container" id="new-route-stepper">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/submit')} style={{ marginBottom: 16 }}>
                <ArrowLeft size={14} /> Back
            </button>

            <div className="page-header"><h1>New Route Submission</h1></div>
            <StepperProgress steps={STEPS} currentStep={step} />

            {/* Validation Messages */}
            {stepErrors.length > 0 && (
                <div className="validation-box validation-error" id="step-errors">
                    <AlertTriangle size={16} />
                    <div>{stepErrors.map((e, i) => <div key={i}>{e}</div>)}</div>
                </div>
            )}
            {stepWarnings.length > 0 && (
                <div className="validation-box validation-warning" id="step-warnings">
                    <AlertTriangle size={16} />
                    <div>{stepWarnings.map((w, i) => <div key={i}>{w}</div>)}</div>
                </div>
            )}

            {/* Step Content */}
            <div className="stepper-content">
                {step === 1 && (
                    <div className="form-step" id="step-network">
                        <h3 className="form-step-title">Select Network</h3>
                        {loadingNetworks ? (
                            <div className="loading-state">Loading networks...</div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Network</label>
                                <select
                                    className="form-select"
                                    id="select-network"
                                    value={data.network_name}
                                    onChange={e => update('network_name', e.target.value)}
                                >
                                    <option value="">— Select a network —</option>
                                    {networks.map(n => (
                                        <option key={n.id} value={n.name}>
                                            {n.name} ({n.route_count} routes)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="form-step" id="step-source">
                        <h3 className="form-step-title">Source Location</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Location Name</label>
                                <input className="form-input" id="input-source-location" placeholder="e.g. HQ – Redwing Techworks"
                                    value={data.source_location_name} onChange={e => update('source_location_name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Takeoff Zone Name</label>
                                <input className="form-input" id="input-source-tz" placeholder="e.g. HQ North Pad"
                                    value={data.source_takeoff_zone_name} onChange={e => update('source_takeoff_zone_name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Latitude</label>
                                <input className="form-input" id="input-source-lat" type="number" step="any" placeholder="e.g. 13.1637751"
                                    value={data.source_latitude} onChange={e => update('source_latitude', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Longitude</label>
                                <input className="form-input" id="input-source-lng" type="number" step="any" placeholder="e.g. 77.8672772"
                                    value={data.source_longitude} onChange={e => update('source_longitude', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="form-step" id="step-destination">
                        <h3 className="form-step-title">Destination Location</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Location Name</label>
                                <input className="form-input" id="input-dest-location" placeholder="e.g. Demo Site Alpha"
                                    value={data.destination_location_name} onChange={e => update('destination_location_name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Landing Zone Name</label>
                                <input className="form-input" id="input-dest-lz" placeholder="e.g. Demo Alpha South Pad"
                                    value={data.destination_landing_zone_name} onChange={e => update('destination_landing_zone_name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Latitude</label>
                                <input className="form-input" id="input-dest-lat" type="number" step="any" placeholder="e.g. 13.2100000"
                                    value={data.destination_latitude} onChange={e => update('destination_latitude', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Longitude</label>
                                <input className="form-input" id="input-dest-lng" type="number" step="any" placeholder="e.g. 77.9100000"
                                    value={data.destination_longitude} onChange={e => update('destination_longitude', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="form-step" id="step-route-details">
                        <h3 className="form-step-title">Route Details</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Takeoff Direction (°)</label>
                                <input className="form-input" id="input-takeoff-dir" type="number" min="0" max="360" placeholder="e.g. 180"
                                    value={data.takeoff_direction} onChange={e => update('takeoff_direction', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Approach Direction (°)</label>
                                <input className="form-input" id="input-approach-dir" type="number" min="0" max="360" placeholder="e.g. 90"
                                    value={data.approach_direction} onChange={e => update('approach_direction', e.target.value)} />
                            </div>
                            <div className="form-group form-group--full">
                                <label className="form-label">Mission Filename</label>
                                <input className="form-input" id="input-mission-filename" placeholder="e.g. HQ-DEMO-180m.waypoints"
                                    value={data.mission_filename} onChange={e => update('mission_filename', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="form-step" id="step-drive-links">
                        <h3 className="form-step-title">Google Drive Links</h3>
                        <div className="form-group">
                            <label className="form-label">Waypoint File (required)</label>
                            <input className="form-input" id="input-mission-link" placeholder="https://drive.google.com/file/d/..."
                                value={data.mission_drive_link} onChange={e => update('mission_drive_link', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Elevation Image (optional)</label>
                            <input className="form-input" id="input-elevation-link" placeholder="https://drive.google.com/file/d/..."
                                value={data.elevation_image_drive_link} onChange={e => update('elevation_image_drive_link', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Route Image (optional)</label>
                            <input className="form-input" id="input-route-link" placeholder="https://drive.google.com/file/d/..."
                                value={data.route_image_drive_link} onChange={e => update('route_image_drive_link', e.target.value)} />
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div className="form-step" id="step-summary">
                        <h3 className="form-step-title">Review & Confirm</h3>

                        {/* Server validation status */}
                        {validating && (
                            <div className="validation-box validation-info">
                                <Loader2 size={16} className="spin" /> Validating with server...
                            </div>
                        )}

                        {serverValidation && !serverValidation.is_valid && (
                            <div className="validation-box validation-error">
                                <AlertTriangle size={16} />
                                <div>
                                    <strong>Server validation failed:</strong>
                                    {serverValidation.errors.map((e, i) => <div key={i}>• {e}</div>)}
                                    {serverValidation.drive_link_errors.map((e, i) => <div key={`d${i}`}>• {e}</div>)}
                                </div>
                            </div>
                        )}

                        {serverValidation?.warnings?.length > 0 && (
                            <div className="validation-box validation-warning">
                                <AlertTriangle size={16} />
                                <div>
                                    <strong>Warnings:</strong>
                                    {serverValidation.warnings.map((w, i) => <div key={i}>• {w}</div>)}
                                </div>
                            </div>
                        )}

                        {duplicateCheck?.is_exact_duplicate && (
                            <div className="validation-box validation-error">
                                <AlertTriangle size={16} />
                                <div><strong>Exact duplicate detected:</strong> {duplicateCheck.message}</div>
                            </div>
                        )}

                        {duplicateCheck?.is_near_duplicate && !duplicateCheck.is_exact_duplicate && (
                            <div className="validation-box validation-warning">
                                <AlertTriangle size={16} />
                                <div><strong>Near-duplicate warning:</strong> {duplicateCheck.message}</div>
                            </div>
                        )}

                        {serverValidation?.is_valid && !duplicateCheck?.is_exact_duplicate && (
                            <div className="validation-box validation-success">
                                <CheckCircle size={16} /> All checks passed
                            </div>
                        )}

                        {/* Summary data */}
                        <div className="summary-grid">
                            <div className="summary-section">
                                <div className="summary-section-title">Network</div>
                                <div className="summary-row"><span>Network</span><strong>{data.network_name}</strong></div>
                            </div>
                            <div className="summary-section">
                                <div className="summary-section-title">Source</div>
                                <div className="summary-row"><span>Location</span><strong>{data.source_location_name}</strong></div>
                                <div className="summary-row"><span>Takeoff Zone</span><strong>{data.source_takeoff_zone_name}</strong></div>
                                <div className="summary-row"><span>Coordinates</span><strong>{data.source_latitude}, {data.source_longitude}</strong></div>
                            </div>
                            <div className="summary-section">
                                <div className="summary-section-title">Destination</div>
                                <div className="summary-row"><span>Location</span><strong>{data.destination_location_name}</strong></div>
                                <div className="summary-row"><span>Landing Zone</span><strong>{data.destination_landing_zone_name}</strong></div>
                                <div className="summary-row"><span>Coordinates</span><strong>{data.destination_latitude}, {data.destination_longitude}</strong></div>
                            </div>
                            <div className="summary-section">
                                <div className="summary-section-title">Route</div>
                                <div className="summary-row"><span>Takeoff Dir</span><strong>{data.takeoff_direction}°</strong></div>
                                <div className="summary-row"><span>Approach Dir</span><strong>{data.approach_direction}°</strong></div>
                                <div className="summary-row"><span>Mission File</span><strong>{data.mission_filename}</strong></div>
                            </div>
                            <div className="summary-section summary-section--full">
                                <div className="summary-section-title">Drive Links</div>
                                <div className="summary-row"><span>Waypoints</span><strong className="summary-link">{data.mission_drive_link}</strong></div>
                                {data.elevation_image_drive_link && (
                                    <div className="summary-row"><span>Elevation</span><strong className="summary-link">{data.elevation_image_drive_link}</strong></div>
                                )}
                                {data.route_image_drive_link && (
                                    <div className="summary-row"><span>Route Image</span><strong className="summary-link">{data.route_image_drive_link}</strong></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="stepper-nav">
                {step > 1 && (
                    <button className="btn btn-ghost" onClick={handleBack} disabled={submitting}>
                        <ArrowLeft size={14} /> Back
                    </button>
                )}
                <div style={{ flex: 1 }} />
                {step < 6 && (
                    <button className="btn btn-primary" id="btn-next" onClick={handleNext}>
                        Next <ArrowRight size={14} />
                    </button>
                )}
                {step === 6 && (
                    <button
                        className="btn btn-primary"
                        id="btn-submit"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                    >
                        {submitting ? <><Loader2 size={14} className="spin" /> Submitting...</> : <><Send size={14} /> Submit Route</>}
                    </button>
                )}
            </div>
        </div>
    );
}
