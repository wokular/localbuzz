import { h } from 'preact';
import { useState } from 'preact/hooks';
import RedlandsMap from './RedlandsMap.jsx';

// Data for categories, integrated from CategoryFilter.jsx
const categories = [
  { id: 'all', label: 'All' },
  { id: 'Bakery', label: 'Bakery' },
  { id: 'Beverages', label: 'Beverages' },
  { id: 'Floral', label: 'Floral' },
  { id: 'Confectionary', label: 'Sweets' }, // Assuming 'Sweets' maps to 'Confectionary'
  { id: 'Crafts', label: 'Craft' }
];

// Data for travel modes
const travelModes = [
  { id: 'drive', label: 'Driving' },
  { id: 'walk', label: 'Walking' },
  { id: 'none', label: 'None' }
];

export default function MapRoute({ featureLayerUrl }) {
  const [selectedCategory, setSelectedCategory] = useState('Bakery'); // Default to Bakery
  const [selectedTravelMode, setSelectedTravelMode] = useState('none');

  // Handler now directly used by the UI elements in this component
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    console.log('Category changed to:', category);
  };

  // Handler now directly used by the UI elements in this component
  const handleTravelModeChange = (travelMode) => {
    setSelectedTravelMode(travelMode);
    console.log('Travel mode changed to:', travelMode);
  };

  return (
    <div class="w-[1920px] h-[1080px] relative bg-white overflow-hidden">
      {/* --- Main Map Area --- */}
      <div class="w-[1266px] h-[753px] left-[496px] top-[263px] absolute rounded-[20px]">
        <RedlandsMap
          featureLayerUrl={featureLayerUrl}
          selectedCategory={selectedCategory}
          selectedTravelMode={selectedTravelMode}
        />
      </div>

      {/* --- Left Sidebar / Category Filter --- */}
      <div class="w-96 h-[911px] left-[80px] top-[100px] absolute bg-neutral-100 rounded-[20px] p-6">
        <a href="/">
          <img class="w-32 ml-26 mt-8 absolute transition delay-150 duration-300 ease-in-out hover:-translate-y-1" src="./logo_bee.svg" />
        </a>

        <div class="absolute top-[263px] w-full left-0 px-10 flex flex-col space-y-5">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`w-full h-14 text-3xl font-['Nexa'] leading-[54px] rounded-[5px] border border-neutral-300 transition-colors
                        ${selectedCategory === category.id
                  ? 'bg-buzz text-white border-buzz'
                  : 'bg-white text-black hover:bg-neutral-200'
                }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Top Bar / Search and Travel Mode Filter --- */}
      <div class="w-[1266px] h-36 left-[488px] top-[100px] absolute bg-neutral-100 rounded-[10px] flex items-center justify-between px-6">
        {/* Search Bar */}
        <div class="flex-grow h-16 mr-6 flex justify-between items-center bg-white rounded-[10px] border-2 border-neutral-300">
          <div class="ml-4 text-black text-3xl font-normal font-['Nexa']">Search for a vendor</div>
          <div class="w-12 h-12 ml-2 rounded-[10px] mr-1 mt-4">
            <img src="./search_icon.svg" height="30" width="30" />
          </div>
        </div>

        {/* Travel Mode Buttons */}
        <div class="flex items-center space-x-4">
          {travelModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleTravelModeChange(mode.id)}
              className={`h-16 px-8 rounded-[10px] border-2 text-3xl font-light font-['Nexa'] transition-colors
                        ${selectedTravelMode === mode.id
                  ? 'bg-gray-300 border-gray-400'
                  : 'bg-white border-neutral-300 hover:bg-neutral-200'
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
