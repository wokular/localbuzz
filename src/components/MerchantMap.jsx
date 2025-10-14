// GeoEnrichedMap.jsx
import { h } from 'preact';
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';

import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import Graphic from '@arcgis/core/Graphic';

const FILTER_STATES = {
    NONE: 0,
    ASC: 1,
    DESC: 2
};
const LABELS = ['None', 'Low - High', 'High - Low'];

// 1. Dropdown filter styled per Figma
function DropdownFilter({ state, setState }) {
    const [open, setOpen] = useState(false);
    const toggle = () => setOpen(o => !o);
    const onSelect = idx => { setState(idx); setOpen(false); };

    return (
        <div className="relative w-52 mb-2">
            <div className="relative w-full h-11 cursor-pointer" onClick={toggle}>
                <div className="absolute inset-0 rounded-[5px] border-2 border-neutral-300 flex items-center px-4">
                    <span className="text-sm font-normal font-black font-['Nexa']">
                        {LABELS[state]}
                    </span>
                </div>
            </div>
            {open && (
                <div className="absolute mt-1 w-full bg-white rounded-[5px] shadow-lg z-10 overflow-hidden">
                    {LABELS.map((opt, idx) => (
                        <button
                            key={idx}
                            className={`w-full h-11 flex items-center px-4 text-sm font-black font-['Nexa'] ${state === idx ? 'bg-buzz text-white' : 'text-black font-normal'
                                }`}
                            onClick={() => onSelect(idx)}
                            style="cursor: pointer;"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// 2. Reusable button component
function FilterBtn({ title, state, setState }) {
    const handleClick = () => {
        setState(prev => (prev + 1) % LABELS.length);
    };

    return (
        <button onClick={handleClick}>
            {title}: {LABELS[state]}
        </button>
    );
}

export default function GeoEnrichedMap({ portalItemId, onMainPinChange }) {
    const viewDiv = useRef(null);
    const [selectedAttrs, setSelectedAttrs] = useState(null);
    const [featureLayers, setFeatureLayers] = useState([]);
    const [points, setPoints] = useState([]);

    const viewRef = useRef(null);
    const markerLayerRef = useRef(null);
    const highlightLayerRef = useRef(null);

    const keyMap = {
        "thematic_value2": "2025 Median Household Income",
        "thematic_value3": "2025 Per Capita Income",
        "thematic_value4": "2025 Median Disposable Income",
    }

    const dollarFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const flagPath = "M4 15C4 15 5 14 8 14C11 14 13 16 16 16C19 16 20 15 20 15V3C20 3 19 4 16 4C13 4 11 2 8 2C5 2 4 3 4 3L4 22";
    const pinPath = "M12 22C13 17 20 16.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 16.4183 11 17 12 22Z M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"

    // 3. Numeric sort/filter state
    const [incomeFilter, setIncomeFilter] = useState(FILTER_STATES.NONE);
    const [ageFilter, setAgeFilter] = useState(FILTER_STATES.NONE);
    const [mainPinId, setMainPinId] = useState(null);

    // 4. Compute sorted/filtered list before rendering
    const displayedPoints = useMemo(() => {
        const arr = [...points];
        arr.sort((a, b) => {
            const aHas = !!a.hexagon;
            const bHas = !!b.hexagon;
            if (!aHas && bHas) return 1;
            if (aHas && !bHas) return -1;

            const ai = a.hexagon.graphic.attributes.thematic_value2 || 0;
            const bi = b.hexagon.graphic.attributes.thematic_value2 || 0;
            const incomeDiff =
                incomeFilter === FILTER_STATES.ASC ? ai - bi
                    : incomeFilter === FILTER_STATES.DESC ? bi - ai
                        : 0;
            if (incomeDiff !== 0) return incomeDiff;

            const aa = a.hexagon.graphic.attributes.thematic_value3 || 0;
            const ba = b.hexagon.graphic.attributes.thematic_value3 || 0;
            const ageDiff =
                ageFilter === FILTER_STATES.ASC ? aa - ba
                    : ageFilter === FILTER_STATES.DESC ? ba - aa
                        : 0;
            return ageDiff;
        });
        return arr.slice(0, 10);
    }, [points, incomeFilter, ageFilter]);


    function handleClearPoints() {
        const markerLayer = markerLayerRef.current;
        const highlightLayer = highlightLayerRef.current;
        setPoints([]);
        setMainPinId(null);
        onMainPinChange?.(null);
        if (markerLayer) markerLayer.removeAll();
        if (highlightLayer) highlightLayer.removeAll();
    }

    useEffect(() => {
        let view;
        (async () => {
            const [
                { default: Map },
                { default: MapView },
                { default: FeatureLayer },
                { default: Basemap },
                { default: BasemapGallery },
                { default: Layer },
                { default: GroupLayer },
                { webMercatorToGeographic },
                { default: GraphicsLayer },
            ] = await Promise.all([
                import('@arcgis/core/Map'),
                import('@arcgis/core/views/MapView'),
                import('@arcgis/core/layers/FeatureLayer'),
                import('@arcgis/core/Basemap'),
                import('@arcgis/core/widgets/BasemapGallery'),
                import('@arcgis/core/layers/Layer'),
                import('@arcgis/core/layers/GroupLayer'),
                import('@arcgis/core/geometry/support/webMercatorUtils'),
                import('@arcgis/core/layers/GraphicsLayer'),
            ]);

            // 1. build map  view
            // const coloredPencilBasemap = new Basemap({
            //     portalItem: { id: portalItemId }
            // });
            // const map = new Map({ basemap: coloredPencilBasemap });


            const community = new Basemap({
                portalItem: { id: "e45454cc103f467db8fd4c145122ee42" }
            });
            const map = new Map({ basemap: community });


            view = new MapView({
                container: viewDiv.current,
                map,
                center: [-117.173, 34.0397],
                zoom: 12
            });

            viewRef.current = view;

            view.popup.autoOpenEnabled = false;
            view.popup.openOnClick = false;


            const serviceUrl = "https://services6.arcgis.com/lY62PNsqcliFwZwn/arcgis/rest/services/kfrankland_GlobalOps__193f4460ced34c8c/FeatureServer";
            const layerIds = [0, 2, 3];  // adjust if more/less
            let featureLayers = layerIds.map(id =>
                new FeatureLayer({
                    url: `${serviceUrl}/${id}`,
                    outFields: ['*'],       // return all fields
                    popupEnabled: false,     // we’ll render our own sidebar
                    minScale: 0,   // no zoom‑out limit
                    maxScale: 0
                })
            );

            // const serviceUrlEnv = "https://services6.arcgis.com/lY62PNsqcliFwZwn/arcgis/rest/services/kfrankland_GlobalOps__d416fb3b94534208/FeatureServer";

            // const envData = new FeatureLayer({
            //     url: `${serviceUrlEnv}/${3}`,
            //     outFields: ['*'],       // return all fields
            //     popupEnabled: false,     // we’ll render our own sidebar
            //     minScale: 0,   // no zoom‑out limit
            //     maxScale: 0,
            // })
            // featureLayers.push(envData);


            // 4. optionally group them in one entry
            const opsGroup = new GroupLayer({
                title: "GlobalOps Features",
                layers: featureLayers,
                opacity: 1
            });
            map.add(opsGroup);

            // optional: let users switch basemaps
            // const bmGallery = new BasemapGallery({ view });
            // view.ui.add(bmGallery, 'top-right');

            // bmGallery.watch('activeBasemap', (bm) => {
            //     console.log('new basemap id:', bm);
            //     localStorage.setItem('myBasemapId', bm.id);
            // });

            // highlight layer (on top of markers)
            const highlightLayer = new GraphicsLayer();
            highlightLayerRef.current = highlightLayer;
            map.add(highlightLayer);


            // create a graphics layer for point markers
            const markerLayer = new GraphicsLayer();
            markerLayerRef.current = markerLayer;
            map.add(markerLayer);

            // click handler against your FeatureLayer array
            view.on('click', async evt => {

                const pinSymbol = new SimpleMarkerSymbol({ style: 'path', size: '20px', color: '#ec9e00', outline: { width: 1 }, path: pinPath, xoffset: 0, yoffset: 8 });
                const flagSymbol = new SimpleMarkerSymbol({ style: 'path', size: '20px', color: '#edae2f', outline: { width: 1 }, path: flagPath, xoffset: 6, yoffset: 7 });


                // hit on the hexagons
                const hit = await view.hitTest(evt, { include: featureLayers[1] });
                const result = hit.results[0];
                setSelectedAttrs(result?.graphic?.attributes || null);
                console.log(hit?.results[0]?.mapPoint?.latitude, hit?.results[0]?.mapPoint?.longitude);


                // remove existing marker
                // hit on the marker layer
                const hitMarker = await view.hitTest(evt, { include: [markerLayer] });
                if (hitMarker.results.length) {
                    const graphic = hitMarker.results[0].graphic;
                    setPoints(prev => {
                        // revert any old pin (except this)
                        prev.forEach(p => {
                            if (p.val === 1 && p.id !== graphic.uid) {
                                const oldG = markerLayer.graphics.items.find(g => g.uid === p.id);
                                if (oldG) oldG.symbol = flagSymbol;
                            }
                        });
                        return prev
                            .map(p => {
                                if (p.id === graphic.uid) {
                                    if (p.val === 1) {
                                        // unselect
                                        markerLayer.remove(graphic);
                                        setMainPinId(null);
                                        onMainPinChange?.(null);
                                        return null;
                                    } else {
                                        // select this
                                        graphic.symbol = pinSymbol;
                                        setMainPinId(graphic.uid);
                                        onMainPinChange?.(JSON.stringify(p));
                                        return { ...p, val: 1 };
                                    }
                                }
                                // force others to unselected
                                return { ...p, val: 0 };
                            })
                            .filter(Boolean);
                    });
                    return;
                }

                // 3️⃣ otherwise add new point
                const mp = evt.mapPoint;
                const geo = webMercatorToGeographic(mp);

                const graphic = new Graphic({ geometry: mp, symbol: flagSymbol });
                markerLayer.add(graphic);
                setPoints(prev => [
                    ...prev,
                    {
                        id: graphic.uid,
                        val: 0,  // starts at zero
                        latitude: geo.latitude.toFixed(6),
                        longitude: geo.longitude.toFixed(6),
                        hexagon: result
                    }
                ]);

            });

            // layer 0 is blue boundary
            // layer 1 is hexagons

            view.watch('zoom', newZoom => {
                // choose your break‑point and opacities
                const threshold = 15;
                const highZoomOpacity = 0.0;   // when zoomed in past threshold
                const lowZoomOpacity = 0.6;   // when zoomed out

                const o = newZoom >= threshold
                    ? highZoomOpacity
                    : lowZoomOpacity;

                // or apply to each feature layer directly:
                featureLayers.forEach((layer) => layer.opacity = o);
                featureLayers[0].opacity = 1;

            });

        })();



        return () => view?.destroy();
    }, [portalItemId]);


    // when user clicks in the sidebar list
    function handlePointClick(p) {
        console.log(p.id);

        const view = viewRef.current;
        const markerLayer = markerLayerRef.current;
        const highlightLayer = highlightLayerRef.current;

        // find the graphic
        console.log(markerLayer.graphics.items);

        const g = markerLayer.graphics.items.find(g => g.uid === p.id);
        if (!g || !view) return;


        // clear old highlight
        highlightLayer.removeAll();

        // add new highlight symbol
        // const highlightSymbol = new SimpleMarkerSymbol({
        //     style: 'circle',
        //     size: '30px',
        //     color: [0, 0, 0, 0],        // transparent fill
        //     outline: { color: 'yellow', width: 4 }
        // });
        // highlightLayer.add(new Graphic({
        //     geometry: g.geometry,
        //     symbol: highlightSymbol
        // }));

        // pan/zoom to it
        view.goTo({ target: g.geometry, zoom: Math.max(view.zoom, 14) });
    }

    // 4. render sidebar + searchbar + map stacked
    return (
        <div className="w-full h-full flex">
            {/* — Full‑height Sidebar */}
            <aside className="w-72 h-full bg-neutral-100 rounded-[20px] p-4">

                <h2 className="text-2xl font-['Nexa'] mb-4">Points</h2>
                {points.length === 0 ? (
                    <p>Click on the map to <br></br> add a marker.</p>
                ) : (
                    <>
                        <div className="text-lg font-normal font-['Nexa'] text-black mb-2">Filter points by:</div>
                        <div className="text-base font-black font-['Nexa'] text-black ">Income:</div>
                        <DropdownFilter state={incomeFilter} setState={setIncomeFilter} />
                        <div className="text-base font-black font-['Nexa'] text-black">Age:</div>
                        <DropdownFilter state={ageFilter} setState={setAgeFilter} />
                        <button
                            onClick={handleClearPoints}
                            className="w-full px-3 py-1 rounded-[10px] border-2 border-neutral-300 text-base font-['Nexa']" style="cursor: pointer;"
                        >Clear Points</button>
                        <ul className="space-y-2 mt-4 h-70 overflow-y-scroll">
                            {displayedPoints.map(p => {
                                const isSelected = p.val === 1;
                                const incomeValue = p.hexagon?.graphic?.attributes?.thematic_value2 != null
                                    ? dollarFormatter.format(p.hexagon.graphic.attributes.thematic_value2)
                                    : 'No $';

                                return (
                                    <li
                                        key={p.id}
                                        onClick={() => handlePointClick(p)}
                                        className={`flex flex-col px-4 py-2 mb-2 rounded font-['Nexa'] ${isSelected ? ' text-white' : 'bg-white'
                                            }`}
                                        style={`${isSelected ? 'background-color: #ec9e00;' : ""} cursor: pointer;`}
                                    >
                                        {/* Top line: Income */}
                                        <div className="text-sm font-bold">
                                            <span className="text-sm font-normal">{keyMap["thematic_value2"]}</span>: {incomeValue}
                                        </div>
                                        {/* Bottom line: Location */}
                                        <div className="text-xs mt-1">
                                            Location: {p.latitude}, {p.longitude}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                    </>
                )}
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

                {/* Map */}
                <div
                    ref={viewDiv}
                    className="flex-1 bg-neutral-100 rounded-[20px] overflow-hidden"
                />
            </div>
        </div>
    );

}
