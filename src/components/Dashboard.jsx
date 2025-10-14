import { h } from 'preact'
import { useState, useRef, useEffect } from 'preact/hooks'
import { useArcGISMap } from './useArcMap';
import GeoEnrichedMap from './MerchantMap'
import DashGrid from './DashGrid'

export default function Dashboard({ portalItemId }) {
    const [viewMode, setViewMode] = useState('dashboard')   // 'dashboard' or 'map'
    const [selectedPoint, onMainPinChange] = useState(null)
    const mapContainerRef = useRef(null)


    // always call the hook—whenever mapContainerRef.current is rendered
    useArcGISMap(mapContainerRef, portalItemId, onMainPinChange, selectedPoint);


    // When DashGrid’s “map card” is clicked:
    const openMap = () => setViewMode('map')
    // Back button on full‑screen map:
    const backToDashboard = () => setViewMode('dashboard')

    if (viewMode === 'map') {
        // Full‑screen map view
        return (
            <div className="w-full h-full flex flex-col p-6">
                <button
                    onClick={backToDashboard}
                    className=" text-sm underline"
                >
                    ← Back to Dashboard
                </button>
                <div className="flex-1 rounded-[20px] overflow-hidden border-2 border-neutral-300">
                    <GeoEnrichedMap
                        portalItemId={portalItemId}
                        mapContainerRef={mapContainerRef}
                        onMainPinChange={onMainPinChange}
                    />
                </div>
            </div>
        )
    }

    // Otherwise: dashboard grid + (optionally) sidebar/search
    return (
        <div className="w-full h-full flex flex-col p-20">
            <div className="w-full h-full flex ">
                {/* — Full‑height Sidebar */}
                <aside className="w-72 h-full bg-neutral-100 rounded-[20px] p-6 flex flex-col">
                    {/* Logo */}
                    <a href="/">
                        <img
                            src="/logo_bee.svg"
                            alt="Logo"
                            className="w-24 h-28 mb-6 transition delay-150 duration-300 ease-in-out hover:-translate-y-1" />
                    </a>

                    {/* Primary Nav */}
                    <h2 className="text-lg font-['Nexa'] font-black mb-3">Menu</h2>
                    <a href="#zip" className="text-base font-['Nexa'] font-light mb-2 hover:underline">
                        Zip Code Analysis
                    </a>
                    <a href="#tapestry" className="text-base font-['Nexa'] font-light mb-6 hover:underline">
                        Tapestry Segment
                    </a>

                    {/* Secondary Nav */}
                    <h2 className="text-lg font-['Nexa'] font-black mb-3">General</h2>
                    <a href="#settings" className="text-base font-['Nexa'] font-light mb-2 hover:underline">
                        Settings
                    </a>
                    <a href="#help" className="text-base font-['Nexa'] font-light mb-2 hover:underline">
                        Help
                    </a>
                    <a href="#logout" className="text-base font-['Nexa'] font-light mb-6 hover:underline">
                        Logout
                    </a>

                    {/* push download card to bottom */}
                    <div className="mt-auto w-full">
                        <div className="bg-black rounded-[10px] p-4">
                            <p className="text-white text-base font-['Nexa'] font-black leading-7">
                                Download <span className="font-normal">our Mobile App</span>
                            </p>
                            <button className="mt-4 w-full text-sm bg-buzz rounded-[5px] py-2 text-white font-['Nexa'] font-black" style="cursor: pointer;">
                                Download
                            </button>
                        </div>
                    </div>
                </aside>


                {/* — Right column: Search Bar on top, Map below */}
                <div className="flex-1 flex flex-col h-full pl-4 space-y-4">
                    {/* Search Bar */}
                    <div className="bg-neutral-100 rounded-[10px] p-4 flex items-center">
                        <input
                            type="text"
                            placeholder="Search"
                            className="flex-1 px-4 py-2 text-2xl font-['Nexa'] border-2 border-neutral-300 rounded-[10px]"
                        />
                        <button className="ml-2 px-4 py-2 text-xl rounded-[10px] border-2 border-neutral-300">
                            Alerts
                        </button>
                        <button className="ml-2 px-4 py-2 text-xl rounded-[10px] border-2 border-neutral-300">
                            Inbox
                        </button>
                        <button className="ml-2 px-4 py-2 text-xl rounded-[10px] border-2 border-neutral-300">
                            Profile
                        </button>
                    </div>

                    {
                        selectedPoint?.hexagon?.graphic?.attributes?.thematic_value2
                    }

                    {/* Dashboard Main View */}
                    <div className="flex-1 bg-neutral-100 rounded-[20px] overflow-hidden">
                        <DashGrid
                            portalItemId={portalItemId}
                            mapContainerRef={mapContainerRef}
                            selectedPoint={selectedPoint}
                            onMainPinChange={onMainPinChange}
                            onMapClick={() => setViewMode('map')}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
