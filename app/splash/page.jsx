"use client";
import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const mountRef = useRef(null);
  const [hint, setHint] = useState(true);
  const [thrown, setThrown] = useState(false);

  useEffect(() => {
    setTimeout(() => setHint(false), 3000);
  }, []);

  useEffect(() => {
    let THREE, renderer, scene, camera, animId;
    let board, dart, dartGroup;
    let phase = "idle";
    let flyProgress = 0;
    let clickPoint = { x: 0, y: 0 };

    const mount = mountRef.current;

    const init = async () => {
      THREE = await import("three");

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);
      scene.fog = new THREE.Fog(0x050505, 8, 20);

      // Camera
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 5.5);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      mount.appendChild(renderer.domElement);

      // Lights
      const ambient = new THREE.AmbientLight(0x1a0a05, 2);
      scene.add(ambient);

      // Main spotlight from above-left
      const spot1 = new THREE.SpotLight(0xffd0a0, 80);
      spot1.position.set(-3, 5, 4);
      spot1.angle = 0.35;
      spot1.penumbra = 0.7;
      spot1.castShadow = true;
      spot1.shadow.mapSize.width = 2048;
      spot1.shadow.mapSize.height = 2048;
      scene.add(spot1);

      // Rim light from right
      const spot2 = new THREE.SpotLight(0xff2020, 15);
      spot2.position.set(4, 2, 3);
      spot2.angle = 0.5;
      spot2.penumbra = 1;
      scene.add(spot2);

      // Floor bounce
      const point1 = new THREE.PointLight(0x200a00, 10, 8);
      point1.position.set(0, -3, 2);
      scene.add(point1);

      // Build board
      buildBoard(THREE, scene);

      // Build dart
      buildDart(THREE, scene);

      // Wall behind board
      const wallGeo = new THREE.PlaneGeometry(12, 8);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x1a0a04,
        roughness: 0.95,
        metalness: 0,
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.z = -1.2;
      wall.receiveShadow = true;
      scene.add(wall);

      window.addEventListener("resize", onResize);
      animate();
    };

    const buildBoard = (THREE, scene) => {
      board = new THREE.Group();

      const SEG = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

      // Wood surround
      const surroundGeo = new THREE.CylinderGeometry(1.22, 1.22, 0.12, 64);
      const surroundMat = new THREE.MeshStandardMaterial({
        color: 0x3a1804,
        roughness: 0.85,
        metalness: 0.05,
      });
      const surround = new THREE.Mesh(surroundGeo, surroundMat);
      surround.rotation.x = Math.PI / 2;
      surround.castShadow = true;
      surround.receiveShadow = true;
      board.add(surround);

      // Draw the face on a canvas texture
      const size = 1024;
      const cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      const ctx = cv.getContext("2d");
      const cx = size / 2, cy = size / 2, r = size * 0.46;

      const SA = -Math.PI / 2 - Math.PI / 20;

      // Black base
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();

      // Segments
      const zones = [
        [0.998, 0.92, "#c8181f", "#1a7535"],
        [0.92,  0.76, "#1c1c1a", "#ede0b8"],
        [0.76,  0.615,"#c8181f", "#1a7535"],
        [0.615, 0.555,"#1c1c1a", "#ede0b8"],
        [0.555, 0.16, "#1c1c1a", "#ede0b8"],
      ];
      zones.forEach(([outer, inner, ec, oc]) => {
        for (let i = 0; i < 20; i++) {
          const a1 = SA + (i/20)*Math.PI*2;
          const a2 = SA + ((i+1)/20)*Math.PI*2;
          ctx.beginPath();
          ctx.arc(cx, cy, r*outer, a1, a2);
          ctx.arc(cx, cy, r*inner, a2, a1, true);
          ctx.closePath();
          ctx.fillStyle = i%2===0 ? ec : oc;
          ctx.fill();
        }
      });

      // Wires
      const wc = "rgba(180,180,180,0.9)";
      [0.998,0.92,0.76,0.615,0.555,0.16].forEach(rad => {
        ctx.beginPath();
        ctx.arc(cx, cy, r*rad, 0, Math.PI*2);
        ctx.strokeStyle = wc; ctx.lineWidth = 2.5; ctx.stroke();
      });
      for (let i = 0; i < 20; i++) {
        const a = SA + (i/20)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)*r*0.16, cy + Math.sin(a)*r*0.16);
        ctx.lineTo(cx + Math.cos(a)*r*0.998, cy + Math.sin(a)*r*0.998);
        ctx.strokeStyle = wc; ctx.lineWidth = 2; ctx.stroke();
      }

      // Numbers
      ctx.font = `900 ${Math.round(r*0.11)}px Arial Black`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let i = 0; i < 20; i++) {
        const na = SA + ((i+0.5)/20)*Math.PI*2;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
        ctx.fillText(SEG[i], cx+Math.cos(na)*r*1.07, cy+Math.sin(na)*r*1.07);
      }
      ctx.shadowBlur = 0;

      // Bull
      ctx.beginPath();
      ctx.arc(cx,cy,r*0.16,0,Math.PI*2);
      ctx.fillStyle = "#1a7535"; ctx.fill();
      ctx.strokeStyle = wc; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx,cy,r*0.076,0,Math.PI*2);
      const bullGrad = ctx.createRadialGradient(cx-4,cy-4,0,cx,cy,r*0.076);
      bullGrad.addColorStop(0,"#ff3030");
      bullGrad.addColorStop(1,"#8a0808");
      ctx.fillStyle = bullGrad; ctx.fill();
      ctx.strokeStyle = wc; ctx.lineWidth = 2; ctx.stroke();

      // Sheen
      const sheen = ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,0,cx,cy,r);
      sheen.addColorStop(0,"rgba(255,255,255,0.07)");
      sheen.addColorStop(1,"rgba(0,0,0,0.2)");
      ctx.beginPath();
      ctx.arc(cx,cy,r*0.998,0,Math.PI*2);
      ctx.fillStyle = sheen; ctx.fill();

      const tex = new THREE.CanvasTexture(cv);
      const faceGeo = new THREE.CircleGeometry(1.0, 128);
      const faceMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.82,
        metalness: 0.0,
      });
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.z = 0.065;
      face.receiveShadow = true;
      board.add(face);

      // Metal edge ring
      const edgeGeo = new THREE.TorusGeometry(1.01, 0.022, 16, 100);
      const edgeMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.3,
        metalness: 0.9,
      });
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.z = 0.05;
      board.add(edge);

      // Idle gentle rotation
      board.rotation.z = 0.04;
      scene.add(board);
    };

    const buildDart = (THREE, scene) => {
      dartGroup = new THREE.Group();

      // Tip
      const tipGeo = new THREE.ConeGeometry(0.008, 0.12, 8);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.95 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 0.22;
      dartGroup.add(tip);

      // Barrel
      const barrelGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.2, 16);
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0xd4a020,
        roughness: 0.25,
        metalness: 0.85,
      });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.x = 0.08;
      dartGroup.add(barrel);

      // Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.14, 8);
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.4 });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = -0.1;
      dartGroup.add(shaft);

      // Flights (two fins)
      [-1, 1].forEach(side => {
        const flightShape = new THREE.Shape();
        flightShape.moveTo(0, 0);
        flightShape.bezierCurveTo(-0.04, side*0.02, -0.1, side*0.09, -0.14, side*0.11);
        flightShape.bezierCurveTo(-0.1, side*0.07, -0.04, side*0.01, 0, 0);

        const flightGeo = new THREE.ShapeGeometry(flightShape);
        const flightMat = new THREE.MeshStandardMaterial({
          color: 0xcc1820,
          roughness: 0.5,
          metalness: 0.1,
          side: THREE.DoubleSide,
        });
        const flight = new THREE.Mesh(flightGeo, flightMat);
        flight.position.x = -0.17;
        dartGroup.add(flight);
      });

      // Start position — left side of screen
      dartGroup.position.set(-3.5, -0.8, 1);
      dartGroup.rotation.z = 0.08;

      scene.add(dartGroup);
    };

    let time = 0;
    let flyFrom = new (null, null, null);
    let flyTo = new (null, null, null);
    let boardHit = { x: 0, y: 0 };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.016;

      if (phase === "idle") {
        dartGroup.position.x = -3.5 + Math.sin(time * 0.8) * 0.06;
        dartGroup.position.y = -0.8 + Math.sin(time * 1.1) * 0.04;
        board.rotation.z = 0.04 + Math.sin(time * 0.4) * 0.008;
      }

      if (phase === "flying") {
        flyProgress += 0.032;
        const t = Math.min(flyProgress, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

        dartGroup.position.x = -3.5 + (boardHit.x - (-3.5)) * ease;
        dartGroup.position.y = -0.8 + (boardHit.y - (-0.8)) * ease + Math.sin(t * Math.PI) * 0.3;
        dartGroup.position.z = 1 + (0.08 - 1) * ease;
        dartGroup.rotation.z = 0.08 * (1 - ease);

        if (flyProgress >= 1) {
          phase = "stuck";
          setTimeout(() => { window.location.replace("/?from=splash"); }, 1000);
        }
      }

      renderer.render(scene, camera);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const onClick = (e) => {
      if (phase !== "idle") return;
      setThrown(true);
      phase = "flying";
      flyProgress = 0;

      // Map click to board space
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = -(e.clientY / window.innerHeight - 0.5) * 2;
      boardHit.x = nx * 1.1;
      boardHit.y = ny * 1.1;
    };

    mount.addEventListener("click", onClick);
    init();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("click", onClick);
      if (renderer) { renderer.dispose(); mount.removeChild(renderer.domElement); }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden cursor-crosshair">
      <div ref={mountRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <img src="/odc-logo.png" alt="ODC" className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.5)]" />
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F8EBC6]/50">Online Darts Circuit</p>
      </div>

      <div className={`pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 text-center transition-opacity duration-700 ${hint && !thrown ? "opacity-100" : "opacity-0"}`}>
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E51D2A]">Click to throw</p>
        <p className="mt-1 text-xs text-[#F8EBC6]/40">Enter the ODC</p>
      </div>
    </div>
  );
}
