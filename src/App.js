import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// The only data you maintain
const SCENES = ["aurora", "mountains", "tropical_sea", "underwater_ruins"];
const DESKTOP_FOV = 70; // Set default FOV for desktop/large screens
const MOBILE_FOV = 85;  // Higher FOV for mobile/small screens
const INITIAL_CAMERA_POSITION = [0, 0, 0.1];
const INITIAL_TARGET = [0, 0, 0];

// Automatically generate all required filenames
function makeScene(id) {
  const base = `/scenes/${id}`;
  return {
    id,
    name: id
      .split("_")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    layout: `${base}/layout.png`,
    faces: {
      right: `${base}/right.png`,
      left: `${base}/left.png`,
      top: `${base}/top.png`,
      bottom: `${base}/bottom.png`,
      front: `${base}/front.png`,
      back: `${base}/back.png`,
    },
  };
}

function findItemById(id) {
  return SCENES.includes(id) ? makeScene(id) : null;
}

function CubeViewer({ faces }) {
  const { scene } = useThree();

  const [cubeTexture] = useState(() => {
    // The order for CubeTextureLoader is: right, left, top, bottom, front, back
    const loader = new THREE.CubeTextureLoader();
    return loader.load([
      faces.right,
      faces.left,
      faces.top,
      faces.bottom,
      faces.front,
      faces.back,
    ]);
  });

  // Apply the cubemap texture as the scene's background
  scene.background = cubeTexture;
  return null;
}

// Component for FOV-based Zoom/Scrolling sensitivity AND Touch Zoom (Pinch-to-Zoom)
function FovZoomHandler() {
  const { camera } = useThree();
  // Ref to store the distance between two fingers at the start of a pinch gesture
  const initialTouchDistance = useRef(null); 
  // Increased sensitivity factor for zoom
  const ZOOM_SENSITIVITY = 0.15;

  // Helper to calculate Euclidean distance between two touch points
  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 1. Handle touch start (capture initial distance)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      initialTouchDistance.current = getDistance(e.touches);
    } else {
      initialTouchDistance.current = null;
    }
  };

  // 2. Handle touch move (calculate zoom based on distance change)
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialTouchDistance.current !== null) {
      // Prevent default browser behavior (like scrolling the page)
      e.preventDefault(); 

      const currentDistance = getDistance(e.touches);
      // Positive delta means pinching in (zoom out, increase FOV)
      // Negative delta means pinching out (zoom in, decrease FOV)
      const deltaDistance = initialTouchDistance.current - currentDistance; 
      
      // Calculate a scaled zoom factor using the increased sensitivity
      const zoomFactor = deltaDistance * ZOOM_SENSITIVITY; 

      camera.fov += zoomFactor;
      // Clamp FOV between a reasonable range (30 to 100 degrees)
      camera.fov = Math.min(Math.max(camera.fov, 30), 100); 
      camera.updateProjectionMatrix();

      // Update initial distance for smooth continuous zooming
      initialTouchDistance.current = currentDistance;
    }
  };

  // 3. Handle touch end (reset distance)
  const handleTouchEnd = () => {
    initialTouchDistance.current = null;
  };

  useEffect(() => {
    // --- Mouse Wheel (Existing) ---
    const handleWheel = (e) => {
      // Increased scrolling sensitivity, consistent with touch
      camera.fov += e.deltaY * ZOOM_SENSITIVITY; 
      camera.fov = Math.min(Math.max(camera.fov, 30), 100); // Range
      camera.updateProjectionMatrix();
    };

    // Use the window object for global mouse wheel events
    window.addEventListener("wheel", handleWheel, { passive: false });
    
    const element = document.getElementById('canvas-container'); 

    if (element) {
      // Attach touch listeners to the container element
      element.addEventListener("touchstart", handleTouchStart, { passive: false });
      element.addEventListener("touchmove", handleTouchMove, { passive: false });
      element.addEventListener("touchend", handleTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (element) {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchmove", handleTouchMove);
        element.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [camera]); // Dependencies ensure the latest 'camera' is used

  return null;
}

// Controls component (The 3x3 Grid only)
function ArrowControls({ controlsRef }) {
    
    // Common classes for square buttons (Reduced size: w-10 h-10 and text-lg)
    const buttonClasses = "bg-white shadow-md rounded-lg text-lg font-bold w-10 h-10 flex items-center justify-center transition-colors hover:bg-gray-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500";
    // Class for invisible placeholders to maintain square grid cells (Reduced size: w-10 h-10)
    const placeholderClasses = "w-10 h-10"; 

    // Helper function for programmatically rotating the camera
    const rotate = useCallback((angleX, angleY) => {
        if (!controlsRef.current) return;
        
        const controls = controlsRef.current;
        const camera = controls.object;
        const target = controls.target;
        
        // 1. Calculate rotation quaternions
        // angleX (around Y-axis) for left/right
        const quaternionX = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), angleX 
        );
        // angleY (around X-axis) for up/down
        const quaternionY = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), angleY 
        );
        
        // 2. Combine and apply rotation to the camera's position relative to its target
        const quaternion = quaternionX.multiply(quaternionY);

        camera.position.sub(target); 
        camera.position.applyQuaternion(quaternion); 
        camera.position.add(target); 

        // 3. Re-orient the camera to look at the target
        camera.lookAt(target);

        controls.update();
    }, [controlsRef]);
    
    // Helper function to handle FOV zoom for buttons
    const zoom = useCallback((factor) => {
        if (!controlsRef.current) return;
        const cam = controlsRef.current.object;
        cam.fov += factor;
        cam.fov = Math.min(Math.max(cam.fov, 30), 100); 
        cam.updateProjectionMatrix();
    }, [controlsRef]);

    // Function to revert view to default
    const revertView = useCallback(() => {
        if (!controlsRef.current) return;
        const controls = controlsRef.current;
        const camera = controls.object;

        // Reset to responsive default FOV
        const defaultFov = window.innerWidth < 640 ? MOBILE_FOV : DESKTOP_FOV;

        // Reset Camera Position and Target
        camera.position.set(...INITIAL_CAMERA_POSITION);
        controls.target.set(...INITIAL_TARGET);

        // Reset FOV
        camera.fov = defaultFov;
        camera.updateProjectionMatrix();

        controls.update();
    }, [controlsRef]);


  return (
      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-100/80 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200">
        
        {/* Row 1: [Placeholder] [UP] [Placeholder] */}
        <div className={placeholderClasses}></div> {/* Col 1 */}
        <button className={buttonClasses} onClick={() => rotate(0, 0.1)}>↑</button> {/* Col 2: UP */}
        <div className={placeholderClasses}></div> {/* Col 3 */}

        {/* Row 2: [LEFT] [REVERT] [RIGHT] */}
        <button className={buttonClasses} onClick={() => rotate(0.1, 0)}>←</button> {/* Col 1: LEFT */}
        <button className={buttonClasses} onClick={revertView} title="Revert to Default View">🎯</button> {/* Col 2: REVERT */}
        <button className={buttonClasses} onClick={() => rotate(-0.1, 0)}>→</button> {/* Col 3: RIGHT */}

        {/* Row 3: [ZOOM IN] [DOWN] [ZOOM OUT] */}
        <button className={buttonClasses} onClick={() => zoom(-5)} title="Zoom In">+</button> {/* Col 1: ZOOM IN */}
        <button className={buttonClasses} onClick={() => rotate(0, -0.1)}>↓</button> {/* Col 2: DOWN */}
        <button className={buttonClasses} onClick={() => zoom(5)} title="Zoom Out">-</button> {/* Col 3: ZOOM OUT */}
      </div>
  );
}

export default function App() {
  const controlsRef = useRef(null);
  const [selected, setSelected] = useState(null);
  // State for responsive FOV, initialized with desktop default.
  const [fov, setFov] = useState(DESKTOP_FOV); 
  // New state to manage controls visibility
  const [showControls, setShowControls] = useState(true);

  // URL-based scene loading
  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "viewer" && parts[1]) {
      const loaded = findItemById(parts[1]);
      if (loaded) setSelected(loaded);
    }
  }, []);

  // Set initial FOV based on screen size (for mobile responsiveness)
  useEffect(() => {
    // Check if device is likely mobile (width less than Tailwind's 'sm' breakpoint 640px)
    const initialFov = window.innerWidth < 640 ? MOBILE_FOV : DESKTOP_FOV;
    setFov(initialFov);
  }, []); // Run only once on mount

  // Change URL on selection
  function selectItem(item) {
    setSelected(item);
    window.history.pushState({}, "", `/viewer/${item.id}`);
  }

  function goHome() {
    setSelected(null);
    window.history.pushState({}, "", `/`);
  }

  return (
    // Ensure the main container takes full screen width/height
    <div className="w-screen h-screen font-sans bg-gray-50 overflow-auto"> 

      {!selected && (
        <div className="max-w-4xl mx-auto p-6 min-h-screen flex flex-col">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800">SyncCube Gallery</h1>
            <h2 className="text-xl font-bold mt-2 text-gray-600">CS492(C) Visual Generation Contest: Team 10</h2>
          </header>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"> 
            {SCENES.map((id) => {
              const item = makeScene(id);
              return (
                <div
                  key={id}
                  className="cursor-pointer bg-white border-2 border-transparent rounded-2xl overflow-hidden shadow-2xl transition duration-300 transform hover:scale-[1.03] hover:border-blue-500 p-4"
                  onClick={() => selectItem(item)}
                >
                  <img
                    src={item.layout}
                    alt={`Preview of ${item.name}`}
                    className="w-full h-40 object-cover rounded-lg mb-3 shadow-md"
                  />
                  <div className="text-center text-xl font-bold text-gray-700">{item.name}</div>
                  <p className="text-sm text-gray-500 text-center mt-1">Click to explore</p>
                </div>
              );
            })}
          </div>
          
          <footer className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
            <p className="font-semibold mb-2 text-gray-700">Members & Contact:</p>
            <div className="flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-4">
                <p>Dongwoo Won (<a href="mailto:aiwwdw@kaist.ac.kr" className="text-blue-600 hover:text-blue-800 font-medium">aiwwdw@kaist.ac.kr</a>)</p>
                <p>Dongheon Han (<a href="mailto:henongod@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium">henongod@gmail.com</a>)</p>
                <p>Eunjun Lee (<a href="mailto:alohaeddielee@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium">alohaeddielee@gmail.com</a>)</p>
            </div>
          </footer>
        </div>
      )}

      {selected && (
        <div id="canvas-container" className="w-full h-full relative"> 
          <Canvas
            className="w-full h-full"
            camera={{ fov: fov, position: INITIAL_CAMERA_POSITION }} 
          >
            <CubeViewer faces={selected.faces} />
            <FovZoomHandler />

            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
              rotateSpeed={-0.5}
              enableZoom={false} // zoom handled manually via FOV scrolling/buttons/touch
              enableDamping={false}
              enableKeys={true}
            />
          </Canvas>

          {/* TOP LEFT: Back button */}
          <div className="absolute top-4 left-4 z-20">
              <button
                  className="bg-gray-100 px-4 py-2 rounded-xl shadow-xl font-medium text-gray-700 hover:bg-gray-200 transition duration-150 border border-gray-300"
                  onClick={goHome}
              >
                  ← Back
              </button>
          </div>

          {/* TOP RIGHT: Controls Group (3x3 Grid and Toggle Button) */}
          <div className="absolute top-4 right-4 flex flex-col items-end z-20">
              
              {/* 3x3 Arrow Controls Grid - Collapsible container */}
              <div className={`
                transition-[opacity,max-height,margin] duration-300 ease-in-out overflow-hidden
                ${showControls 
                    ? 'opacity-100 pointer-events-auto max-h-96 mb-2' // Visible: tall max-height and margin-bottom
                    : 'opacity-0 pointer-events-none max-h-0 mb-0'    // Hidden: zero height/margin, invisible, unclickable
                }
              `}>
                  <ArrowControls controlsRef={controlsRef} /> 
              </div>
              
              {/* Toggle Button - Will sit directly under the grid (mb-2 gap) or at the top when collapsed */}
              <button
                  className="px-4 py-2 rounded-xl font-medium text-blue-600 hover:text-blue-800 transition duration-150 border-2 border-blue-600 bg-white shadow-xl"
                  onClick={() => setShowControls(prev => !prev)}
                  title={showControls ? 'Hide keyboard and button controls' : 'Show keyboard and button controls'}
              >
                  {showControls ? 'Hide Controls' : 'Show Controls'} 
              </button>
          </div>
        </div>
      )}
    </div>
  );
}