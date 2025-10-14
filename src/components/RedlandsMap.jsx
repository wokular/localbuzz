import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export default function RedlandsMap({ featureLayerUrl, selectedCategory = 'all', selectedTravelMode = 'none' }) {
  const viewDiv = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    let view;
    let featureLayer;
    let searchWidget;
    let layerView;
    let travelMode = null;

    (async () => {
      try {
        console.log("Starting RedlandsMap component...");
        console.log("Selected category:", selectedCategory);
        console.log("Selected travel mode:", selectedTravelMode);

        // Load core ArcGIS modules
        console.log("Loading ArcGIS modules...");

        // Import modules individually to debug
        const { default: esriConfig } = await import('@arcgis/core/config');
        const { default: Map } = await import('@arcgis/core/Map');
        const { default: MapView } = await import('@arcgis/core/views/MapView');
        const { default: FeatureLayer } = await import('@arcgis/core/layers/FeatureLayer');
        const { default: PopupTemplate } = await import('@arcgis/core/PopupTemplate');
        const { default: Search } = await import('@arcgis/core/widgets/Search');
        const { default: Graphic } = await import('@arcgis/core/Graphic');

        const { default: SimpleRenderer } = await import('@arcgis/core/renderers/SimpleRenderer');
        const { default: SimpleMarkerSymbol } = await import('@arcgis/core/symbols/SimpleMarkerSymbol');

        console.log("Loading network analysis modules...");
        const networkServiceModule = await import('@arcgis/core/rest/networkService');
        const serviceAreaModule = await import('@arcgis/core/rest/serviceArea');
        const { default: ServiceAreaParameters } = await import('@arcgis/core/rest/support/ServiceAreaParameters');
        const { default: FeatureSet } = await import('@arcgis/core/rest/support/FeatureSet');

        console.log("networkServiceModule:", networkServiceModule);
        console.log("serviceAreaModule:", serviceAreaModule);

        const networkService = networkServiceModule.default || networkServiceModule;
        const serviceArea = serviceAreaModule.default || serviceAreaModule;

        console.log("ArcGIS modules loaded successfully");
        console.log("networkService module:", networkServiceModule);
        console.log("networkService loaded:", !!networkService);
        console.log("networkService.fetchServiceDescription:", !!networkService?.fetchServiceDescription);
        console.log("serviceArea loaded:", !!serviceArea);
        console.log("ServiceAreaParameters loaded:", !!ServiceAreaParameters);
        console.log("FeatureSet loaded:", !!FeatureSet);

        // Set API key
        const API_KEY = import.meta.env.PUBLIC_ARCGIS_API_KEY;
        if (API_KEY) {
          esriConfig.apiKey = API_KEY;
          console.log("API key set successfully");
        } else {
          console.warn("No API key found - service area may not work");
        }

        // Service Area REST endpoint
        const serviceAreaUrl = 'https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World';

        const pointRenderer = new SimpleRenderer({
          symbol: new SimpleMarkerSymbol({
            size: '12px', // Increase the size here
            color: '#D1342F', // A nice red color
            outline: {
              color: 'white',
              width: 1,
            },
          }),
        });

        // Create the map and view
        const map = new Map({ basemap: 'streets-vector' });
        if (featureLayerUrl) {
          const popupTemplate = new PopupTemplate({
            title: '{name}',
            content: [{
              type: 'fields',
              fieldInfos: [
                { fieldName: 'name', label: 'Name', visible: true },
                { fieldName: 'Address', label: 'Address', visible: true },
                { fieldName: 'Category', label: 'Category', visible: true },
                { fieldName: 'description', label: 'Description', visible: true }
              ]
            }]
          });

          featureLayer = new FeatureLayer({
            url: featureLayerUrl,
            popupTemplate,
            renderer: pointRenderer, // Apply the renderer here
            outFields: ['*'],
            title: 'Redlands Features'
          });
          map.add(featureLayer);
        }

        view = new MapView({
          container: viewDiv.current,
          map,
          center: [-117.177, 34.0502],
          zoom: 13,
          popup: {
            dockEnabled: true,
            dockOptions: { position: 'bottom-right', breakpoint: false }
          }
        });
        viewRef.current = view;

        // Add Search widget
        searchWidget = new Search({
          view,
          position: 'top-right',
          includeDefaultSources: true,
          searchAllEnabled: true,
          popupEnabled: false,
          popupOpenOnSelect: true
        });
        view.ui.add(searchWidget, 'top-right');

        // Wait for view to load
        await view.when();
        console.log("Map view is ready");

        // Get the layer view for filtering later
        if (featureLayer) {
          layerView = await view.whenLayerView(featureLayer);
          console.log("Layer view ready for filtering");
        }

        // Handle search results
        searchWidget.on('select-result', async (event) => {
          try {
            console.log("=== SEARCH RESULT SELECTED ===");
            console.log("Search result:", event.result);
            console.log("Geometry:", event.result.feature.geometry);
            console.log("Current travel mode:", selectedTravelMode);

            // Clear previous graphics and filters
            view.graphics.removeAll();
            if (layerView) {
              layerView.filter = null;
            }

            // Create marker for the searched location
            const locationGraphic = createGraphic(event.result.feature.geometry);

            // Only create service area if a travel mode is selected
            if (selectedTravelMode !== 'none') {
              await findServiceArea(locationGraphic);
            } else {
              console.log("No travel mode selected, showing all points");
            }

          } catch (error) {
            console.error('Error in search result handler:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
          }
        });

        // Create the location graphic (matching reference code)
        function createGraphic(geometry) {
          const graphic = new Graphic({
            geometry,
            symbol: {
              type: 'simple-marker',
              color: 'blue',
              size: 16,
              style: 'diamond',
            }
          });
          view.graphics.add(graphic);
          return graphic;
        }

        // Find service area (matching reference code but with time instead of distance)
        async function findServiceArea(locationFeature) {
          try {
            console.log("=== FINDING SERVICE AREA ===");

            // Reset travel mode if it doesn't match current selection
            if (travelMode) {
              const currentModeName = travelMode.name;
              const expectedModeName = selectedTravelMode === 'walk' ? 'Walking Time' : 'Driving Time';
              if (currentModeName !== expectedModeName) {
                console.log(`Travel mode changed from ${currentModeName} to ${expectedModeName}, resetting...`);
                travelMode = null;
              }
            }

            if (!travelMode) {
              console.log("Fetching network description...");
              console.log("networkService object:", networkService);
              console.log("networkService.fetchServiceDescription:", networkService?.fetchServiceDescription);

              if (!networkService || !networkService.fetchServiceDescription) {
                throw new Error("networkService not properly loaded");
              }

              const networkDescription = await networkService.fetchServiceDescription(serviceAreaUrl);
              console.log("Network description:", networkDescription);
              console.log("Available travel modes:", networkDescription.supportedTravelModes?.map(m => m.name));

              // Look for the appropriate travel mode based on selection
              let targetModeName;
              if (selectedTravelMode === 'walk') {
                targetModeName = "Walking Time";
              } else if (selectedTravelMode === 'drive') {
                targetModeName = "Driving Time";
              } else {
                console.log("No travel mode selected, skipping service area");
                return;
              }

              travelMode = networkDescription.supportedTravelModes.find(
                (travelMode) => travelMode.name === targetModeName
              );

              if (!travelMode) {
                console.error(`${targetModeName} travel mode not found`);
                console.log("Available modes:", networkDescription.supportedTravelModes.map(m => m.name));
                return;
              }

              console.log("Using travel mode:", travelMode.name);
            }

            const serviceAreaParameters = new ServiceAreaParameters({
              facilities: new FeatureSet({
                features: [locationFeature],
              }),
              defaultBreaks: [5], // 5 minutes (changed from 2.5 km)
              travelMode,
              travelDirection: "to-facility",
              outSpatialReference: view.spatialReference,
              trimOuterPolygon: true,
            });

            console.log("Service area parameters:", serviceAreaParameters);
            console.log("Solving service area...");

            const result = await serviceArea.solve(
              serviceAreaUrl,
              serviceAreaParameters
            );

            console.log("=== FULL SERVICE AREA SOLVE RESULT ===");
            console.log("Complete result object:", JSON.stringify(result, null, 2));
            console.log("Result keys:", Object.keys(result));

            const { serviceAreaPolygons } = result;
            console.log("Extracted serviceAreaPolygons:", serviceAreaPolygons);
            console.log("serviceAreaPolygons type:", typeof serviceAreaPolygons);
            console.log("serviceAreaPolygons features:", serviceAreaPolygons?.features);
            console.log("Number of features:", serviceAreaPolygons?.features?.length);

            showServiceAreas(serviceAreaPolygons);

          } catch (error) {
            console.error('Error finding service area:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
          }
        }

        // Show service areas (matching reference code)
        function showServiceAreas(serviceAreaPolygons) {
          try {
            console.log("=== SHOWING SERVICE AREAS ===");
            console.log("Service area polygons:", serviceAreaPolygons);
            console.log("serviceAreaPolygons is truthy:", !!serviceAreaPolygons);
            console.log("serviceAreaPolygons.features exists:", !!serviceAreaPolygons?.features);
            console.log("serviceAreaPolygons.features.length:", serviceAreaPolygons?.features?.length);

            if (serviceAreaPolygons && serviceAreaPolygons.features.length > 0) {
              console.log("Service area polygons found:", serviceAreaPolygons.features.length);

              const saGraphics = serviceAreaPolygons.features.map((g, index) => {
                console.log(`Polygon ${index}:`, g);
                g.symbol = {
                  type: 'simple-fill',
                  color: [225, 150, 0, 0.5], // Orange with transparency (matching reference)
                  outline: {
                    color: 'white',
                    width: 0.5,
                  }
                };
                return g;
              });

              console.log("Graphics to add:", saGraphics);
              console.log("Number of graphics to add:", saGraphics.length);
              view.graphics.addMany(saGraphics, 0);
              console.log("Added service area polygons to view:", saGraphics.length);
              console.log("Total graphics in view:", view.graphics.length);

              // Apply spatial filter to only show points within the polygon
              if (layerView) {
                layerView.filter = {
                  geometry: serviceAreaPolygons.features[0].geometry,
                  spatialRelationship: 'intersects'
                };
                console.log("Applied spatial filter to layer view");
              }
            } else {
              console.warn("No service area polygons returned from solve");
            }

          } catch (error) {
            console.error('Error showing service areas:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
          }
        }

      } catch (error) {
        console.error('Error loading Redlands map with service area:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
    })();

    return () => {
      if (view) {
        if (searchWidget) view.ui.remove(searchWidget);
        view.destroy();
        viewRef.current = null;
      }
    };
  }, [featureLayerUrl, selectedTravelMode]);

  // Effect for category filtering
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const layer = view.map.layers.find((l) => l.title === 'Redlands Features');
    if (!layer) return;

    view.whenLayerView(layer).then((lv) => {
      if (selectedCategory && selectedCategory !== 'all') {
        layer.definitionExpression = `Category = '${selectedCategory}'`;
        console.log(`Applied category filter: ${selectedCategory}`);
      } else {
        layer.definitionExpression = null;
        console.log("Removed category filter");
      }
      // Note: Spatial filter remains set on layerView.filter
    });
  }, [selectedCategory]);

  // Effect for travel mode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Clear spatial filter if travel mode is set to 'none'
    if (selectedTravelMode === 'none') {
      view.whenLayerView(view.map.layers.find((l) => l.title === 'Redlands Features')).then((lv) => {
        if (lv) {
          lv.filter = null;
          console.log("Cleared spatial filter - showing all points");
        }
      });
    }
  }, [selectedTravelMode]);

  return (
    <div ref={viewDiv} className="w-full h-full" style={{ minHeight: '400px' }} />
  );
}
