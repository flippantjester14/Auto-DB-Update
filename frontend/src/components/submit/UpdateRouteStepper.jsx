import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/api';
import { useToast } from '../shared/Toast';
import StepperProgress from './StepperProgress';
import DiffDisplay from './DiffDisplay';

const STEPS = ['Select Network', 'Select Route', 'Edit Fields', 'Review & Submit'];

export default function UpdateRouteStepper() {
    const navigate = useNavigate();
    const addToast = useToast();
    const [step, setStep] = useState(1);
    const [networks, setNetworks] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [selectedNetworkId, setSelectedNetworkId] = useState('');
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [editedData, setEditedData] = useState({});
    const [originalData, setOriginalData] = useState({});
    const [loadingNetworks, setLoadingNetworks] = useState(true);
    const [loadingRoutes, setLoadingRoutes] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [validating, setValidating] = useState(false);
    const [serverValidation, setServerValidation] = useState(null);
    const [duplicateCheck, setDuplicateCheck] = useState(null);
    const [stepErrors, setStepErrors] = useState([]);

    useEffect(() => {
        api.getNetworks()
            .then(setNetworks)
            .catch(e => addToast(`Failed to load networks: ${e.message}`))
            .finally(() => setLoadingNetworks(false));
    }, []);

    const loadRoutes = async (networkId) => {
        setLoadingRoutes(true);
        try {
            const data = await api.getNetworkRoutes(networkId);
            setRoutes(data);
        } catch (e) {
            addToast(`Failed to load routes: ${e.message}`);
        } finally {
            setLoadingRoutes(false);
        }
    };

    const selectNetwork = (networkId) => {
        setSelectedNetworkId(networkId);
        if (networkId) loadRoutes(networkId);
    };

    const selectRoute = (route) => {
        setSelectedRoute(route);
        const networkName = networks.find(n => n.id === route.network_id)?.name || '';
        const data = {
            network_name: networkName,
            source_location_name: route.start_location_name,
            source_takeoff_zone_name: route.start_lz_name,
            source_latitude: route.start_latitude,
            source_longitude: route.start_longitude,
            destination_location_name: route.end_location_name,
            destination_landing_zone_name: route.end_lz_name,
            destination_latitude: route.end_latitude,
            destination_longitude: route.end_longitude,
            takeoff_direction: route.takeoff_direction,
            approach_direction: route.approach_direction,
            mission_filename: route.mission_filename || '',
            mission_drive_link: '',
            elevation_image_drive_link: '',
            route_image_drive_link: '',
        };
        setOriginalData({ ...data });
        setEditedData({ ...data });
    };

    const update = (field, value) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    };

    const getChangedFields = () => {
        const changed = [];
        for (const key of Object.keys(originalData)) {
            if (String(originalData[key]) !== String(editedData[key])) {
                changed.push(key);
            }
        }
        return changed;
    };

    const FIELD_LABELS = {
        network_name: 'Network', source_location_name: 'Source Location',
        source_takeoff_zone_name: 'Takeoff Zone', source_latitude: 'Source Lat',
        source_longitude: 'Source Lng', destination_location_name: 'Dest Location',
        destination_landing_zone_name: 'Landing Zone', destination_latitude: 'Dest Lat',
        destination_longitude: 'Dest Lng', takeoff_direction: 'Takeoff Dir',
        approach_direction: 'Approach Dir', mission_filename: 'Mission File',
        mission_drive_link: 'Mission Link', elevation_image_drive_link: 'Elevation Link',
        route_image_drive_link: 'Route Image Link',
    };

    const validateCurrentStep = () => {
        const errors = [];
        switch (step) {
            case 1:
                if (!selectedNetworkId) errors.push('Please select a network');
                break;
            case 2:
                if (!selectedRoute) errors.push('Please select a route to update');
                break;
            case 3:
                if (getChangedFields().length === 0) errors.push('No changes detected — modify at least one field');
                break;
        }
        setStepErrors(errors);
        return errors.length === 0;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setStepErrors([]);
            setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        setStepErrors([]);
        setStep(s => s - 1);
    };

    const buildPayload = () => ({
        ...editedData,
        source_latitude: Number(editedData.source_latitude),
        source_longitude: Number(editedData.source_longitude),
        destination_latitude: Number(editedData.destination_latitude),
        destination_longitude: Number(editedData.destination_longitude),
        takeoff_direction: Number(editedData.takeoff_direction),
        approach_direction: Number(editedData.approach_direction),
    });

    useEffect(() => {
        if (step === 4) {
            (async () => {
                setValidating(true);
                try {
                    const payload = buildPayload();
                    const [val, dup] = await Promise.all([
                        api.validateSubmission(payload),
                        api.checkDuplicate(payload),
                    ]);
                    setServerValidation(val);
                    setDuplicateCheck(dup);
                } catch (e) {
                    addToast(`Validation failed: ${e.message}`);
                } finally {
                    setValidating(false);
                }
            })();
        }
    }, [step]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const result = await api.createSubmission(buildPayload());
            addToast(`Update submitted: #${result.submission_id.slice(0, 8)}`);
            navigate('/');
        } catch (e) {
            addToast(`Submit failed: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = serverValidation?.is_valid &&
        !duplicateCheck?.is_exact_duplicate && !submitting;

    const changedFields = getChangedFields();

    return (
        <div className="stepper-container" id="update-route-stepper">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/submit')} style={{ marginBottom: 16 }}>
                <ArrowLeft size={14} /> Back
            </button>

            <div className="page-header"><h1>Update Existing Route</h1></div>
            <StepperProgress steps={STEPS} currentStep={step} />

            {stepErrors.length > 0 && (
                <div className="validation-box validation-error">
                    <AlertTriangle size={16} />
                    <div>{stepErrors.map((e, i) => <div key={i}>{e}</div>)}</div>
                </div>
            )}

            <div className="stepper-content">
                {step === 1 && (
                    <div className="form-step" id="update-step-network">
                        <h3 className="form-step-title">Select Network</h3>
                        {loadingNetworks ? (
                            <div className="loading-state">Loading networks...</div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Network</label>
                                <select className="form-select" id="update-select-network"
                                    value={selectedNetworkId} onChange={e => selectNetwork(e.target.value)}>
                                    <option value="">— Select a network —</option>
                                    {networks.map(n => (
                                        <option key={n.id} value={n.id}>{n.name} ({n.route_count} routes)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="form-step" id="update-step-route">
                        <h3 className="form-step-title">Select Route</h3>
                        {loadingRoutes ? (
                            <div className="loading-state">Loading routes...</div>
                        ) : routes.length === 0 ? (
                            <div className="loading-state">No routes found for this network.</div>
                        ) : (
                            <div className="route-select-table-wrap">
                                <table className="data-table" id="route-select-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Route</th>
                                            <th>Mission File</th>
                                            <th>Takeoff</th>
                                            <th>Approach</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {routes.map(r => (
                                            <tr key={r.id}
                                                className={selectedRoute?.id === r.id ? 'selected-row' : ''}
                                                onClick={() => selectRoute(r)}
                                            >
                                                <td className="table-id">#{r.id}</td>
                                                <td>
                                                    <span className="table-route">{r.start_location_name}</span>
                                                    <span className="table-route-arrow"> → </span>
                                                    <span className="table-route">{r.end_location_name}</span>
                                                </td>
                                                <td className="table-meta">{r.mission_filename}</td>
                                                <td className="table-meta">{r.takeoff_direction}°</td>
                                                <td className="table-meta">{r.approach_direction}°</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="form-step" id="update-step-edit">
                        <h3 className="form-step-title">Edit Fields</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
                            Changed fields will be highlighted. Only modified fields are counted.
                        </p>
                        <div className="form-grid">
                            {Object.keys(FIELD_LABELS).map(key => {
                                const isChanged = String(originalData[key]) !== String(editedData[key]);
                                return (
                                    <div className={`form-group ${isChanged ? 'form-group--changed' : ''}`} key={key}>
                                        <label className="form-label">
                                            {FIELD_LABELS[key]}
                                            {isChanged && <span className="changed-badge">CHANGED</span>}
                                        </label>
                                        <input
                                            className="form-input"
                                            value={editedData[key]}
                                            onChange={e => update(key, e.target.value)}
                                            type={['source_latitude','source_longitude','destination_latitude','destination_longitude','takeoff_direction','approach_direction'].includes(key) ? 'number' : 'text'}
                                            step="any"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="form-step" id="update-step-review">
                        <h3 className="form-step-title">Review Changes</h3>

                        {validating && (
                            <div className="validation-box validation-info">
                                <Loader2 size={16} className="spin" /> Validating...
                            </div>
                        )}

                        {serverValidation && !serverValidation.is_valid && (
                            <div className="validation-box validation-error">
                                <AlertTriangle size={16} />
                                <div>
                                    {serverValidation.errors.map((e, i) => <div key={i}>• {e}</div>)}
                                    {serverValidation.drive_link_errors.map((e, i) => <div key={`d${i}`}>• {e}</div>)}
                                </div>
                            </div>
                        )}

                        {duplicateCheck?.is_exact_duplicate && (
                            <div className="validation-box validation-error">
                                <AlertTriangle size={16} />
                                <div>{duplicateCheck.message}</div>
                            </div>
                        )}

                        {serverValidation?.is_valid && !duplicateCheck?.is_exact_duplicate && (
                            <div className="validation-box validation-success">
                                <CheckCircle size={16} /> All checks passed
                            </div>
                        )}

                        <div className="diff-summary">
                            <div className="diff-summary-title">
                                {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed
                            </div>
                            {Object.keys(FIELD_LABELS).map(key => (
                                <DiffDisplay
                                    key={key}
                                    label={FIELD_LABELS[key]}
                                    oldValue={originalData[key]}
                                    newValue={editedData[key]}
                                />
                            ))}
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
                {step < 4 && (
                    <button className="btn btn-primary" onClick={handleNext}>
                        Next <ArrowRight size={14} />
                    </button>
                )}
                {step === 4 && (
                    <button className="btn btn-primary" id="btn-submit-update" onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting ? <><Loader2 size={14} className="spin" /> Submitting...</> : <><Send size={14} /> Submit Update</>}
                    </button>
                )}
            </div>
        </div>
    );
}
