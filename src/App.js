import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';

function App() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 200);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0, 50, 100);
    scene.add(directionalLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Resize handling
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return alert('Please select a file');
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('File uploaded successfully');
      loadSTLModel(response.data.filename);
    } catch (error) {
      console.error(error);
      alert('Error uploading file');
    }
  };

  const loadSTLModel = (filename) => {
    const url = `http://localhost:5000/uploads/${filename}`;
    const loader = new STLLoader();
    loader.load(url, (geometry) => {
      // Scale the model to fit the viewport
      const material = new THREE.MeshStandardMaterial({ color: 0x606060 });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Center the model
      geometry.computeBoundingBox();
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      mesh.position.sub(center);
      
      // Scale up the model
      const maxDim = Math.max(geometry.boundingBox.max.x, geometry.boundingBox.max.y, geometry.boundingBox.max.z);
      mesh.scale.setScalar(100 / maxDim);

      // Clear previous models before adding the new one
      sceneRef.current.children = sceneRef.current.children.filter(obj => !(obj instanceof THREE.Mesh));
      sceneRef.current.add(mesh);

      // Store reference to the loaded model
      modelRef.current = mesh;
    });
  };

  // ✅ UI Button Controls for Rotation, Zooming, and Panning
  const rotateModel = (direction) => {
    if (!modelRef.current) return;
    const rotationAmount = Math.PI / 8;
    if (direction === "left") modelRef.current.rotation.y -= rotationAmount;
    if (direction === "right") modelRef.current.rotation.y += rotationAmount;
  };

  const zoomModel = (direction) => {
    if (!cameraRef.current) return;
    if (direction === "in") cameraRef.current.position.z -= 10;
    if (direction === "out") cameraRef.current.position.z += 10;
  };

  const panModel = (direction) => {
    if (!cameraRef.current) return;
    const panAmount = 10;
    if (direction === "left") cameraRef.current.position.x -= panAmount;
    if (direction === "right") cameraRef.current.position.x += panAmount;
    if (direction === "up") cameraRef.current.position.y += panAmount;
    if (direction === "down") cameraRef.current.position.y -= panAmount;
  };

  const handleExport = async () => {
    if (!selectedFile || !selectedFile.name.toLowerCase().endsWith('.stl')) {
        alert('Please upload a valid STL file before exporting.');
        return;
    }

    try {
        const response = await axios.post('http://localhost:5000/convert', 
            { filename: selectedFile.name }, 
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data.obj_filename) {
            const downloadUrl = `http://localhost:5000/exports/${response.data.obj_filename}`;
            window.open(downloadUrl, '_blank'); // Open in new tab
        } else {
            alert('Error during conversion.');
        }
    } catch (error) {
        console.error(error);
        alert('Error exporting file.');
    }
};



  return (
    
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: '#f8f8f8' }}>
      {/* File Upload UI */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h3 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>Upload 3D Model</h3>
        <input type="file" onChange={handleFileChange} accept=".stl,.obj" style={{ marginBottom: '10px' }} />
        <button onClick={handleUpload} style={{
          padding: '8px 15px',
          backgroundColor: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Upload
        </button>
        <button onClick={handleExport} style={{
          marginTop: '10px',
          padding: '8px 15px',
          backgroundColor: '#28A745',
          color: 'white',
          border: 'none',
          borderRadius: '5PX',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Export to OBJ
        </button>
      </div>

      {/* 3D Viewer */}
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }}></div>
      

      {/* Control Buttons */}
      <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
        <button onClick={() => rotateModel("left")}>⟲ Rotate Left</button>
        <button onClick={() => rotateModel("right")}>⟳ Rotate Right</button>
        <button onClick={() => zoomModel("in")}>➕ Zoom In</button>
        <button onClick={() => zoomModel("out")}>➖ Zoom Out</button>
        <button onClick={() => panModel("left")}>⬅ Pan Left</button>
        <button onClick={() => panModel("right")}>➡ Pan Right</button>
        <button onClick={() => panModel("up")}>⬆ Pan Up</button>
        <button onClick={() => panModel("down")}>⬇ Pan Down</button>
      </div>
      
      

    </div>
  );
}

export default App;
