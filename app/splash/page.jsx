"use client";

import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const mountRef = useRef(null);
  const apiRef = useRef({ burst: null, throwDart: null });
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cleanupFns = [];
    let disposed = false;

    // Load Three.js + postprocessing as a single ES module from CDN
    const loadLibs = () =>
      new Promise((resolve, reject) => {
        if (window.__THREE_BUNDLE__) return resolve(window.__THREE_BUNDLE__);
        const script = document.createElement("script");
        script.type = "module";
        script.textContent = `
          import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
          import { EffectComposer } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
          import { RenderPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
          import { UnrealBloomPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";
          import { ShaderPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js";
          import { RoomEnvironment } from "https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js";
          window.__THREE_BUNDLE__ = { THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, RoomEnvironment };
          window.dispatchEvent(new Event("three-bundle-ready"));
        `;
        window.addEventListener("three-bundle-ready", () => resolve(window.__THREE_BUNDLE__), { once: true });
        script.onerror = reject;
        document.head.appendChild(script);
      });

    loadLibs()
      .then((bundle) => { if (!disposed && mountRef.current) init(bundle); })
      .catch((e) => console.error("3D libraries failed to load", e));

    function init({ THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, RoomEnvironment }) {
      const RED = 0xe51d2a;
      const mount = mountRef.current;
      const W = () => window.innerWidth;
      const H = () => window.innerHeight;

      // ---------- Renderer ----------
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setSize(W(), H());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      mount.appendChild(renderer.domElement);

      // ---------- Scene ----------
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x040404);
      scene.fog = new THREE.FogExp2(0x040404, 0.022);

      const camera = new THREE.PerspectiveCamera(36, W() / H(), 0.1, 100);
      camera.position.set(0, 0.2, 11);

      // ---------- Environment (reflections) ----------
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
      scene.environment = envTex;

      // ---------- Lighting rig ----------
      scene.add(new THREE.AmbientLight(0x20232c, 0.5));

      const key = new THREE.SpotLight(0xfff4e6, 900, 44, Math.PI / 6.5, 0.45, 1.5);
      key.position.set(2.5, 11, 9);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0002;
      key.shadow.radius = 6;
      scene.add(key, key.target);

      const rimRed = new THREE.PointLight(RED, 600, 26, 2);
      rimRed.position.set(0, 0.5, -3.5);
      scene.add(rimRed);

      const coolFill = new THREE.DirectionalLight(0x3a5a8a, 0.7);
      coolFill.position.set(-7, 1.5, 5);
      scene.add(coolFill);

      const movingLight = new THREE.PointLight(0xff5a4a, 220, 22, 2);
      movingLight.position.set(-4, 3, 4);
      scene.add(movingLight);

      // ---------- Procedural textures ----------
      // Sisal fibre normal-ish detail via canvas
      function sisalTexture() {
        const s = 1024;
        const c = document.createElement("canvas");
        c.width = c.height = s;
        const x = c.getContext("2d");
        x.fillStyle = "#0b0b0b";
        x.fillRect(0, 0, s, s);
        for (let i = 0; i < 60000; i++) {
          const px = Math.random() * s, py = Math.random() * s;
          const ang = Math.random() * Math.PI;
          const len = 3 + Math.random() * 6;
          const g = 20 + Math.random() * 60;
          x.strokeStyle = `rgba(${g},${g},${g},${0.15 + Math.random() * 0.25})`;
          x.lineWidth = 0.6 + Math.random() * 0.8;
          x.beginPath();
          x.moveTo(px, py);
          x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
          x.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(3, 3);
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
      }
      const sisal = sisalTexture();

      // ---------- Dartboard group ----------
      const board = new THREE.Group();
      scene.add(board);

      const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
      const SEG = Math.PI / 10;
      const R_OUT = 2.6, R_DBL_O = 2.42, R_DBL_I = 2.3;
      const R_TRP_O = 1.56, R_TRP_I = 1.44;
      const R_BULL_O = 0.34, R_BULL_I = 0.16;
      const DEPTH = 0.16;

      // Materials — tuned to react to env + lights
      const matCream = new THREE.MeshStandardMaterial({ color: 0xe9dcb6, roughness: 0.82, metalness: 0.04, bumpMap: sisal, bumpScale: 0.04 });
      const matBlack = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.88, metalness: 0.03, bumpMap: sisal, bumpScale: 0.04 });
      const matRed   = new THREE.MeshStandardMaterial({ color: 0xc1262a, roughness: 0.5, metalness: 0.05, bumpMap: sisal, bumpScale: 0.03 });
      const matGreen = new THREE.MeshStandardMaterial({ color: 0x1d7a44, roughness: 0.5, metalness: 0.05, bumpMap: sisal, bumpScale: 0.03 });
      const matWire  = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, roughness: 0.18, metalness: 1.0, envMapIntensity: 1.4 });
      const matRim   = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.35, metalness: 0.9 });

      // Backing disk with depth
      const backing = new THREE.Mesh(
        new THREE.CylinderGeometry(R_OUT + 0.16, R_OUT + 0.16, DEPTH + 0.05, 96),
        matRim
      );
      backing.rotation.x = Math.PI / 2;
      backing.position.z = -DEPTH / 2;
      backing.castShadow = true;
      backing.receiveShadow = true;
      board.add(backing);

      // Sectors as extruded ring-segments (real thickness)
      function sector(rIn, rOut, a0, a1, mat, z, depth) {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, rOut, a0, a1, false);
        shape.absarc(0, 0, rIn, a1, a0, true);
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 });
        const m = new THREE.Mesh(geo, mat);
        m.position.z = z;
        m.castShadow = true;
        m.receiveShadow = true;
        return m;
      }

      for (let i = 0; i < 20; i++) {
        const a0 = i * SEG - SEG / 2 + Math.PI / 2;
        const a1 = a0 + SEG;
        const even = i % 2 === 0;
        // singles sit slightly recessed, doubles/trebles raised — like real catch-rings
        board.add(sector(R_BULL_O, R_TRP_I, a0, a1, even ? matBlack : matCream, 0, DEPTH * 0.7));
        board.add(sector(R_TRP_I, R_TRP_O, a0, a1, even ? matGreen : matRed, 0, DEPTH));
        board.add(sector(R_TRP_O, R_DBL_I, a0, a1, even ? matBlack : matCream, 0, DEPTH * 0.7));
        board.add(sector(R_DBL_I, R_DBL_O, a0, a1, even ? matGreen : matRed, 0, DEPTH));
      }

      // Bullseyes (raised)
      const cyl = (r, h, mat, z) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat);
        m.rotation.x = Math.PI / 2;
        m.position.z = z;
        m.castShadow = true;
        return m;
      };
      board.add(cyl(R_BULL_O, DEPTH * 0.9, matGreen, DEPTH * 0.45));
      board.add(cyl(R_BULL_I, DEPTH, matRed, DEPTH * 0.5));

      // ---------- Wire spider (real metal, raised proud of surface) ----------
      const wireZ = DEPTH + 0.015;
      for (let i = 0; i < 20; i++) {
        const a = i * SEG - SEG / 2 + Math.PI / 2;
        const len = R_OUT - R_BULL_O;
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 8), matWire);
        w.position.set(Math.cos(a) * ((R_OUT + R_BULL_O) / 2), Math.sin(a) * ((R_OUT + R_BULL_O) / 2), wireZ);
        w.rotation.z = a - Math.PI / 2;
        w.rotation.x = Math.PI / 2;
        board.add(w);
      }
      [R_DBL_O, R_DBL_I, R_TRP_O, R_TRP_I, R_BULL_O].forEach((r) => {
        const g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 12, 120), matWire);
        g.position.z = wireZ;
        board.add(g);
      });
      // Bold outer rim ring
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(R_OUT, 0.05, 16, 128), matRim);
      outerRing.position.z = wireZ;
      board.add(outerRing);

      // ---------- Number ring (proper black band with embossed numbers) ----------
      function numberBand() {
        const s = 2048;
        const c = document.createElement("canvas");
        c.width = s; c.height = 256;
        const x = c.getContext("2d");
        // band gradient
        const g = x.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, "#1a1a1a"); g.addColorStop(0.5, "#080808"); g.addColorStop(1, "#1a1a1a");
        x.fillStyle = g; x.fillRect(0, 0, s, 256);
        x.font = "900 150px Arial, sans-serif";
        x.textAlign = "center"; x.textBaseline = "middle";
        // numbers go in REVERSE around the canvas so they read correctly when wrapped
        for (let i = 0; i < 20; i++) {
          const cx = (i + 0.5) * (s / 20);
          // subtle red on every 5th for accent
          x.fillStyle = "#f3ecd9";
          x.shadowColor = "rgba(0,0,0,0.9)";
          x.shadowBlur = 8;
          x.fillText(String(NUMBERS[i]), cx, 132);
        }
        const t = new THREE.CanvasTexture(c);
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
      }
      const bandTex = numberBand();
      const bandGeo = new THREE.CylinderGeometry(R_OUT + 0.34, R_OUT + 0.34, 0.5, 128, 1, true);
      const bandMat = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.rotation.x = Math.PI / 2;
      // align rotation so 20 sits at top
      band.rotation.y = Math.PI / 2;
      band.position.z = wireZ - 0.02;
      board.add(band);

      board.scale.setScalar(0);

      // ---------- Wall behind board ----------
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95, metalness: 0.0 });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), wallMat);
      wall.position.z = -1.2;
      wall.receiveShadow = true;
      scene.add(wall);

      // ---------- Volumetric red light column ----------
      const colMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
      const column = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 30), colMat);
      column.position.set(0, 0, -1.0);
      scene.add(column);
      const colCore = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 30),
        new THREE.MeshBasicMaterial({ color: 0xffe9e0, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      colCore.position.set(0, 0, -0.95);
      scene.add(colCore);

      // ---------- Reflective floor ----------
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 120),
        new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.12, metalness: 0.95, envMapIntensity: 0.6 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -3.6;
      floor.receiveShadow = true;
      scene.add(floor);

      // ---------- Dust motes (depth-sorted) ----------
      const moteN = 220;
      const mg = new THREE.BufferGeometry();
      const mp = new Float32Array(moteN * 3);
      for (let i = 0; i < moteN; i++) {
        mp[i * 3] = (Math.random() - 0.5) * 18;
        mp[i * 3 + 1] = (Math.random() - 0.5) * 12;
        mp[i * 3 + 2] = (Math.random() - 0.5) * 8 + 1;
      }
      mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
      const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xff8a7a, size: 0.035, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(motes);

      // ---------- Flying dart ----------
      const dart = buildDart(THREE);
      dart.visible = false;
      dart.scale.setScalar(0.5);
      scene.add(dart);

      // ---------- Post-processing ----------
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.55, 0.7, 0.85);
      composer.addPass(bloom);

      // Vignette + grain + chromatic aberration
      const grainShader = {
        uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.06 }, uVignette: { value: 1.15 }, uAberration: { value: 0.0016 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float uTime, uAmount, uVignette, uAberration; varying vec2 vUv;
          float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }
          void main(){
            vec2 uv = vUv;
            vec2 dir = uv - 0.5;
            // chromatic aberration toward edges
            float r = texture2D(tDiffuse, uv + dir * uAberration).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - dir * uAberration).b;
            vec3 col = vec3(r,g,b);
            // vignette
            float vig = smoothstep(uVignette, 0.3, length(dir));
            col *= vig;
            // film grain
            float gr = (rand(uv + fract(uTime)) - 0.5) * uAmount;
            col += gr;
            gl_FragColor = vec4(col, 1.0);
          }`,
      };
      const grainPass = new ShaderPass(grainShader);
      composer.addPass(grainPass);

      // ---------- Interaction ----------
      let velocity = 0.004;
      const idleSpeed = 0.004;
      let dragging = false, lastX = 0;
      let mx = 0, my = 0;
      const dom = renderer.domElement;
      dom.style.cursor = "grab";

      const down = (x) => { dragging = true; lastX = x; dom.style.cursor = "grabbing"; };
      const move = (x) => { if (dragging) { velocity += (x - lastX) * 0.0007; lastX = x; } };
      const up = () => { dragging = false; dom.style.cursor = "grab"; };

      const onMD = (e) => down(e.clientX);
      const onMM = (e) => { move(e.clientX); mx = e.clientX / W() - 0.5; my = e.clientY / H() - 0.5; };
      const onMU = () => up();
      const onTS = (e) => down(e.touches[0].clientX);
      const onTM = (e) => move(e.touches[0].clientX);
      const onTE = () => up();
      dom.addEventListener("mousedown", onMD);
      window.addEventListener("mousemove", onMM);
      window.addEventListener("mouseup", onMU);
      dom.addEventListener("touchstart", onTS, { passive: true });
      window.addEventListener("touchmove", onTM, { passive: true });
      window.addEventListener("touchend", onTE);

      const onResize = () => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
        composer.setSize(W(), H());
      };
      window.addEventListener("resize", onResize);

      apiRef.current.burst = () => { velocity = 0.55; };
      apiRef.current.throwDart = () => fireDart();

      // dart flight state
      let dartPhase = "idle";
      let dartT = 0;
      const dartFrom = new THREE.Vector3(-7, -1.5, 9);
      const dartTo = new THREE.Vector3(0.55, 0.7, DEPTH + 0.2);
      function fireDart() {
        if (dartPhase !== "idle") return;
        dartPhase = "flying";
        dartT = 0;
        dart.visible = true;
      }
      // auto-throw a dart shortly after load for life
      const autoThrow = setTimeout(fireDart, 2600);

      // ---------- Animate ----------
      let intro = 0;
      const clock = new THREE.Clock();
      const tmpV = new THREE.Vector3();
      let animId;
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();
        const dt = Math.min(clock.getDelta ? 0.016 : 0.016, 0.033);

        if (intro < 1) { intro = Math.min(1, intro + 0.018); const e = 1 - Math.pow(1 - intro, 4); board.scale.setScalar(e); }

        // spin physics
        velocity += (idleSpeed - velocity) * 0.018;
        if (!dragging) velocity *= 0.992;
        velocity = Math.max(velocity, 0.0016);
        board.rotation.z -= velocity;

        // float + parallax tilt
        board.position.y = Math.sin(t * 0.7) * 0.06;
        board.rotation.x = -my * 0.22 + Math.sin(t * 0.5) * 0.025;
        board.rotation.y = mx * 0.35;

        // light + glow pulse
        colMat.opacity = 0.34 + Math.sin(t * 1.5) * 0.1;
        rimRed.intensity = 520 + Math.sin(t * 1.5) * 120;
        movingLight.position.x = Math.sin(t * 0.6) * 5;
        movingLight.position.y = 2.5 + Math.cos(t * 0.5) * 1.5;

        motes.rotation.y = t * 0.015;
        motes.position.y = Math.sin(t * 0.2) * 0.3;

        // dart flight
        if (dartPhase === "flying") {
          dartT += 0.022;
          const tt = Math.min(dartT, 1);
          const ease = tt * tt * (3 - 2 * tt);
          tmpV.lerpVectors(dartFrom, dartTo, ease);
          tmpV.y += Math.sin(tt * Math.PI) * 1.2; // arc
          dart.position.copy(tmpV);
          dart.scale.setScalar(0.5 + ease * 0.5);
          // point toward target
          dart.lookAt(dartTo.x, dartTo.y + 0.0001, dartTo.z + 1);
          dart.rotateY(Math.PI / 2);
          if (dartT >= 1) { dartPhase = "stuck"; dart.position.copy(dartTo); }
        } else if (dartPhase === "stuck") {
          // ride along with board rotation (slightly)
          dart.position.x = dartTo.x;
          dart.position.y = dartTo.y + board.position.y;
        }

        // camera parallax
        camera.position.x += (mx * 0.7 - camera.position.x) * 0.035;
        camera.position.y += (0.2 - my * 0.4 - camera.position.y) * 0.035;
        camera.lookAt(0, 0, 0);

        grainPass.uniforms.uTime.value = t;
        composer.render();
      };
      tick();

      setReady(true);

      cleanupFns.push(() => {
        cancelAnimationFrame(animId);
        clearTimeout(autoThrow);
        dom.removeEventListener("mousedown", onMD);
        window.removeEventListener("mousemove", onMM);
        window.removeEventListener("mouseup", onMU);
        dom.removeEventListener("touchstart", onTS);
        window.removeEventListener("touchmove", onTM);
        window.removeEventListener("touchend", onTE);
        window.removeEventListener("resize", onResize);
        pmrem.dispose();
        composer.dispose?.();
        renderer.dispose();
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      });
    }

    // ---- Detailed dart model ----
    function buildDart(THREE) {
      const g = new THREE.Group();
      const steel = new THREE.MeshStandardMaterial({ color: 0xcfcfd4, roughness: 0.2, metalness: 1.0 });
      const tungsten = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.35, metalness: 0.95 });
      const carbon = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5, metalness: 0.3 });
      const flight = new THREE.MeshStandardMaterial({ color: 0xc1262a, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });

      // tip
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.32, 16), steel);
      tip.rotation.z = -Math.PI / 2; tip.position.x = 0.46; g.add(tip);
      // barrel (knurled tungsten)
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.5, 20), tungsten);
      barrel.rotation.z = Math.PI / 2; barrel.position.x = 0.12; g.add(barrel);
      for (let i = 0; i < 10; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.051, 0.004, 6, 20), steel);
        ring.rotation.y = Math.PI / 2; ring.position.x = -0.05 + i * 0.045; g.add(ring);
      }
      // shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 12), carbon);
      shaft.rotation.z = Math.PI / 2; shaft.position.x = -0.28; g.add(shaft);
      // flights (4 cross-vanes)
      for (let i = 0; i < 4; i++) {
        const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), flight);
        vane.position.x = -0.6;
        vane.rotation.y = Math.PI / 2;
        vane.rotation.x = (i * Math.PI) / 2;
        vane.position.z = 0; vane.position.y = 0;
        // offset so vanes radiate
        const grp = new THREE.Group();
        grp.add(vane);
        grp.rotation.x = (i * Math.PI) / 2;
        grp.position.x = -0.6;
        g.add(grp);
      }
      g.rotation.x = 0;
      return g;
    }

    return () => { disposed = true; cleanupFns.forEach((fn) => fn()); };
  }, []);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    apiRef.current.burst?.();
    setTimeout(() => window.location.replace("/?from=splash"), 850);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#040404] text-[#F3ECD9]">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Loading veil */}
      <div className={`absolute inset-0 z-20 grid place-items-center bg-[#040404] transition-opacity duration-700 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-[#F3ECD9]/15 border-t-[#E51D2A]" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#F3ECD9]/40">Loading the oche</p>
        </div>
      </div>

      {/* Overlay */}
      <div className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 transition-opacity duration-700 md:p-12 ${leaving ? "opacity-0" : "opacity-100"}`}>
        <div className="flex items-center gap-3">
          <img src="/odc-logo.png" alt="ODC" className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.5)]" />
          <div>
            <p className="text-[17px] font-black leading-none tracking-wide">ODC</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#F3ECD9]/55">Online Darts Circuit</p>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#E51D2A] md:text-[13px]">Competitive Online Darts</p>
          <h1 className="mt-3 text-5xl font-black leading-[0.9] tracking-tight md:text-8xl" style={{ textShadow: "0 8px 60px rgba(0,0,0,0.7)" }}>
            Welcome to<br />the <span className="text-[#E51D2A]">ODC.</span>
          </h1>
        </div>

        <div className="flex flex-col items-center gap-5">
          <button
            onClick={enter}
            className="group pointer-events-auto relative overflow-hidden rounded-full bg-[#E51D2A] px-12 py-[18px] text-[15px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_40px_rgba(229,29,42,0.45)] transition hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(229,29,42,0.55)]"
          >
            <span className="relative z-10">Enter the Circuit</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#F3ECD9]/40">Drag to spin · Live tables · Fixtures · Events</p>
        </div>
      </div>
    </div>
  );
}
