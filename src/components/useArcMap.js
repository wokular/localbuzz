// src/hooks/useArcGISMap.js
import { useEffect, useRef } from 'preact/hooks';

import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';

let _view;               // singleton MapView
let _lastPortalItemId;   // remember which portalItemId we used

export function useArcGISMap(containerRef, portalItemId, onMainPinChange) {
    const initialized = useRef(false);

    const markerLayerRef = useRef(null);
    const highlightLayerRef = useRef(null);

    const flagPath = "M4 15C4 15 5 14 8 14C11 14 13 16 16 16C19 16 20 15 20 15V3C20 3 19 4 16 4C13 4 11 2 8 2C5 2 4 3 4 3L4 22";
    const pinPath = "M12 22C13 17 20 16.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 16.4183 11 17 12 22Z M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"


    useEffect(() => {

        if (!containerRef.current) return;

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
                { default: Graphic },
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
                import('@arcgis/core/Graphic'),
            ]);

            // 1. build map  view
            // const coloredPencilBasemap = new Basemap({
            //     portalItem: { id: portalItemId }
            // });
            // const map = new Map({ basemap: coloredPencilBasemap });

            if (!initialized.current || portalItemId !== _lastPortalItemId) {
                // destroy old view if exists
                if (_view) {
                    _view.container = null;
                    _view.destroy();
                }


                const community = new Basemap({
                    portalItem: { id: "e45454cc103f467db8fd4c145122ee42" }
                });
                const map = new Map({ basemap: community });


                _view = new MapView({
                    container: containerRef.current,
                    map,
                    center: [-117.173, 34.0397],
                    zoom: 12
                });

                initialized.current = _view;

                _view.popup.autoOpenEnabled = false;
                _view.popup.openOnClick = false;


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
                // const highlightLayer = new GraphicsLayer();
                // highlightLayerRef.current = highlightLayer;
                // map.add(highlightLayer);


                // create a graphics layer for point markers
                const markerLayer = new GraphicsLayer();
                markerLayerRef.current = markerLayer;
                map.add(markerLayer);

                // click handler against your FeatureLayer array
                // _view.on('click', async evt => {

                //     const pinSymbol = new SimpleMarkerSymbol({ style: 'path', size: '20px', color: '#ec9e00', outline: { width: 1 }, path: pinPath, xoffset: 0, yoffset: 8 });


                //     // hit on the hexagons
                //     const hit = await _view.hitTest(evt, { include: featureLayers[1] });
                //     const result = hit.results[0];
                //     // setSelectedAttrs(result?.graphic?.attributes || null);
                //     console.log(hit?.results[0]?.mapPoint?.latitude, hit?.results[0]?.mapPoint?.longitude);


                //     // remove existing marker
                //     // hit on the marker layer
                //     const hitMarker = await _view.hitTest(evt, { include: [markerLayer] });
                //     if (hitMarker.results.length) {
                //         const graphic = hitMarker.results[0].graphic;
                //         setPoints(prev => {
                //             // revert any old pin (except this)
                //             prev.forEach(p => {
                //                 if (p.val === 1 && p.id !== graphic.uid) {
                //                     const oldG = markerLayer.graphics.items.find(g => g.uid === p.id);
                //                     if (oldG) oldG.symbol = flagSymbol;
                //                 }
                //             });
                //             return prev
                //                 .map(p => {
                //                     if (p.id === graphic.uid) {
                //                         if (p.val === 1) {
                //                             // unselect
                //                             markerLayer.remove(graphic);
                //                             setMainPinId(null);
                //                             onMainPinChange?.(null);
                //                             return null;
                //                         } else {
                //                             // select this
                //                             graphic.symbol = pinSymbol;
                //                             setMainPinId(graphic.uid);
                //                             onMainPinChange?.(JSON.stringify(p));
                //                             return { ...p, val: 1 };
                //                         }
                //                     }
                //                     // force others to unselected
                //                     return { ...p, val: 0 };
                //                 })
                //                 .filter(Boolean);
                //         });
                //         return;
                //     }

                //     // 3️⃣ otherwise add new point
                //     const mp = evt.mapPoint;
                //     const geo = webMercatorToGeographic(mp);

                //     const graphic = new Graphic({ geometry: mp, symbol: flagSymbol });
                //     markerLayer.add(graphic);
                //     setPoints(prev => [
                //         ...prev,
                //         {
                //             id: graphic.uid,
                //             val: 0,  // starts at zero
                //             latitude: geo.latitude.toFixed(6),
                //             longitude: geo.longitude.toFixed(6),
                //             hexagon: result
                //         }
                //     ]);

                // });

                // layer 0 is blue boundary
                // layer 1 is hexagons

                _view.watch('zoom', newZoom => {
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


                initialized.current = true;
                _lastPortalItemId = portalItemId;
            } else {
                // just move existing view into this new container
                _view.container = containerRef.current;
            }

        })();
    }, [portalItemId]);

    // useEffect(() => {
    //     if (!containerRef.current) return;

    //     (async () => {
    //         // dynamic import of everything inside the effect
    //         const [
    //             { default: Map },
    //             { default: MapView },
    //             { default: FeatureLayer },
    //             { default: Basemap },
    //             { default: GroupLayer },
    //             { webMercatorToGeographic },
    //             { default: GraphicsLayer },
    //         ] = await Promise.all([
    //             import('@arcgis/core/Map'),
    //             import('@arcgis/core/views/MapView'),
    //             import('@arcgis/core/layers/FeatureLayer'),
    //             import('@arcgis/core/Basemap'),
    //             import('@arcgis/core/layers/GroupLayer'),
    //             import('@arcgis/core/geometry/support/webMercatorUtils'),
    //             import('@arcgis/core/layers/GraphicsLayer'),
    //         ]);

    //         // if this is the first time or the portalItemId changed, recreate view
    //         if (!initialized.current || portalItemId !== _lastPortalItemId) {
    //             // destroy old view if exists
    //             if (_view) {
    //                 _view.container = null;
    //                 _view.destroy();
    //             }

    //             const basemap = new Basemap({
    //                 portalItem: { id: "e45454cc103f467db8fd4c145122ee42" }
    //             });
    //             const map = new Map({ basemap });

    //             _view = new MapView({
    //                 container: containerRef.current,
    //                 map,
    //                 center: [-117.173, 34.0397],
    //                 zoom: 12,
    //             });

    //             // example click handler hooking into your onMainPinChange
    //             _view.on('click', evt => {
    //                 const gp = webMercatorToGeographic(evt.mapPoint);
    //                 onMainPinChange(JSON.stringify({
    //                     latitude: gp.latitude.toFixed(6),
    //                     longitude: gp.longitude.toFixed(6)
    //                 }));
    //             });

    //             initialized.current = true;
    //             _lastPortalItemId = portalItemId;
    //         } else {
    //             // just move existing view into this new container
    //             _view.container = containerRef.current;
    //         }
    //     })();
    // }, [containerRef, portalItemId, onMainPinChange]);
}
