import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// The only data you maintain
const SCENES = ["aurora", "canyon"];
const DEFAULT_FOV = 60;
const INITIAL_CAMERA_POSITION = [0, 0, 0.1];
const INITIAL_TARGET = [0, 0, 0];

// Automatically generate all required filenames
function makeScene(id) {
  const base = `/scenes/${id}`;
  return {
    id,
    name: id[0].toUpperCase() + id.slice(1),
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

// Component for FOV-based Zoom/Scrolling sensitivity
function FovZoomHandler() {
  const { camera } = useThree();

  useEffect(() => {
    const handleWheel = (e) => {
      // Increased scrolling sensitivity
      camera.fov += e.deltaY * 0.05; 
      camera.fov = Math.min(Math.max(camera.fov, 30), 100); // Range
      camera.updateProjectionMatrix();
    };

    // Attach listener to the window element
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => window.removeEventListener("wheel", handleWheel);
  }, [camera]);

  return null;
}

// Controls component with fixed 3x3 layout
function ArrowControls({ controlsRef }) {
    
    // Common classes for square buttons
    const buttonClasses = "bg-white shadow-md rounded-lg text-xl font-bold w-12 h-12 flex items-center justify-center transition-colors hover:bg-gray-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500";
    // Class for invisible placeholders to maintain square grid cells
    const placeholderClasses = "w-12 h-12"; 

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

        // Reset Camera Position and Target
        camera.position.set(...INITIAL_CAMERA_POSITION);
        controls.target.set(...INITIAL_TARGET);

        // Reset FOV
        camera.fov = DEFAULT_FOV;
        camera.updateProjectionMatrix();

        controls.update();
    }, [controlsRef]);


  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end z-10">
      {/* 3x3 Control Grid - Now strictly 9 items for square layout */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-100/80 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200">
        
        {/* Row 1: [Placeholder] [UP] [Placeholder] */}
        <div className={placeholderClasses}></div> {/* Col 1 */}
        <button className={buttonClasses} onClick={() => rotate(0, -0.1)}>↑</button> {/* Col 2: UP */}
        <div className={placeholderClasses}></div> {/* Col 3 */}

        {/* Row 2: [LEFT] [REVERT] [RIGHT] */}
        <button className={buttonClasses} onClick={() => rotate(0.1, 0)}>←</button> {/* Col 1: LEFT */}
        <button className={buttonClasses} onClick={revertView} title="Revert to Default View">🎯</button> {/* Col 2: REVERT */}
        <button className={buttonClasses} onClick={() => rotate(-0.1, 0)}>→</button> {/* Col 3: RIGHT */}

        {/* Row 3: [ZOOM IN] [DOWN] [ZOOM OUT] */}
        <button className={buttonClasses} onClick={() => zoom(-5)} title="Zoom In">+</button> {/* Col 1: ZOOM IN */}
        <button className={buttonClasses} onClick={() => rotate(0, 0.1)}>↓</button> {/* Col 2: DOWN */}
        <button className={buttonClasses} onClick={() => zoom(5)} title="Zoom Out">-</button> {/* Col 3: ZOOM OUT */}
      </div>
    </div>
  );
}

export default function App() {
  const controlsRef = useRef(null);
  const [selected, setSelected] = useState(null);

  // URL-based scene loading
  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "viewer" && parts[1]) {
      const loaded = findItemById(parts[1]);
      if (loaded) setSelected(loaded);
    }
  }, []);

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
      {/* Scrollable container for the gallery view */}

      {!selected && (
        <div className="max-w-4xl mx-auto p-6 flex flex-col">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800">360° Panorama Gallery</h1>
            <h2 className="text-xl font-bold mt-2 text-gray-600">CS492(C) Team 10: Visual Generation Contest</h2>
          </header>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 flex-grow">
            {SCENES.map((id) => {
              const item = makeScene(id);
              return (
                <div
                  key={id}
                  className="cursor-pointer bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition duration-300 p-4"
                  onClick={() => selectItem(item)}
                >
                  <img
                    src={item.layout}
                    alt={`Preview of ${item.name}`}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                  <div className="text-center text-xl font-semibold text-gray-700">{item.name}</div>
                  <p className="text-sm text-gray-500 text-center mt-1">Click to explore</p>
                </div>
              );
            })}
          </div>
          
          {/* Footer with Team Information */}
          <footer className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
            <p className="font-semibold mb-2 text-gray-700">Team 10 Members & Contact:</p>
            <div className="flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-4">
                <p>Dongwoo Won (<a href="mailto:aiwwdw@kaist.ac.kr" className="text-blue-600 hover:text-blue-800 font-medium">aiwwdw@kaist.ac.kr</a>)</p>
                <p>Dongheon Han (<a href="mailto:henongod@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium">henongod@gmail.com</a>)</p>
                <p>Eunjun Lee (<a href="mailto:alohaeddielee@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium">alohaeddielee@gmail.com</a>)</p>
            </div>
          </footer>
        </div>
      )}

      {selected && (
        <div className="w-full h-full relative">
          <Canvas
            className="w-full h-full"
            camera={{ fov: DEFAULT_FOV, position: INITIAL_CAMERA_POSITION }}
          >
            <CubeViewer faces={selected.faces} />
            <FovZoomHandler />

            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
              rotateSpeed={-0.5}
              enableZoom={false} // zoom handled manually via FOV scrolling/buttons
              // Damping disabled
              enableDamping={false}
              // Arrow keys enabled for built-in navigation
              enableKeys={true}
            />
          </Canvas>

          <ArrowControls controlsRef={controlsRef} />

          {/* Back button */}
          <button
            className="absolute top-4 left-4 bg-white px-4 py-2 rounded-xl shadow-lg font-medium text-gray-700 hover:bg-gray-100 transition duration-150 z-20"
            onClick={goHome}
          >
            ← Back to Gallery
          </button>
          
          {/* Title Overlay */}
          <div className="absolute top-4 right-4 p-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg z-20">
              <h2 className="text-xl font-bold text-gray-800">{selected.name}</h2>
          </div>
        </div>
      )}
    </div>
  );
}