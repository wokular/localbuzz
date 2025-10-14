// components/MerchantMapWithHeader.jsx
import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import GeoEnrichedMap from './MerchantMap';

export default function MerchantMapWithHeader({ portalItemId }) {
    const [mainPinPoint, setMainPinPoint] = useState(null);
    const [viewMode, setViewMode] = useState('dashboard')   // 'dashboard' or 'map'
    const [selectedPoint, setSelectedPoint] = useState(null)
    const mapContainerRef = useRef(null)
    return (
        <div className="w-full h-full flex flex-col p-20">
            {/* <p>Main Pin Point: {mainPinPoint ?? 'none selected'}</p> */}
            <GeoEnrichedMap
                portalItemId={portalItemId}
                mapContainerRef={mapContainerRef}
                onMainPinChange={setSelectedPoint}
            />
        </div>
    );
}
