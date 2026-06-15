"use client";

import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const mountRef = useRef(null);
  const apiRef = useRef({ burst: null });
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let renderer, scene, camera, animId, cleanupFns = [];
    let disposed = false;

    // ---- Load Three.js from CDN as an ES module ----
    const loadThree = () =>
      new Promise((resolve, reject) => {
        if (window.__THREE__) return resolve(window.__THREE__);
        const script = document.createElement("script");
        script.type = "module";
        script.textContent = `
          import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js";
          window.__THREE__ = THREE;
          window.dispatchEvent(new Event("three-ready"));
        `;
        window.addEventListener("three-ready", () => resolve(window.__THREE__), { once: true });
        script.onerror = reject;
        document.head.appendChild(script);
      });

    loadThree()
      .then((THREE) => {
        if (disposed || !mountRef.current) return;
        init(THREE);
      })
      .catch((e) => console.error("Three.js failed to load", e));

    function init(THREE) {
      const RED = 0xe51d2a;
      const mount = mountRef.current;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);
      scene.fog = new THREE.Fog(0x050505, 14, 30);

      camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0.4, 11);

      // ---- Lights ----
      scene.add(new THREE.AmbientLight(0x2a2a30, 0.6));

      const spot = new THREE.SpotLight(0xffffff, 700, 40, Math.PI / 6, 0.4, 1.4);
      spot.position.set(0, 12, 8);
      spot.castShadow = true;
      spot.shadow.mapSize.set(2048, 2048);
      scene.add(spot, spot.target);

      const rim = new THREE.PointLight(RED, 350, 30);
      rim.position.set(0, 1, -4);
      scene.add(rim);

      const fill = new THREE.DirectionalLight(0x4466aa, 0.5);
      fill.position.set(-6, 2, 4);
      scene.add(fill);

      // ---- Red glow column ----
      const colMat = new THREE.MeshBasicMaterial({
        color: RED, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const column = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 26), colMat);
      column.position.set(0, 0, -3.2);
      scene.add(column);

      const column2 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 26),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
      );
      column2.position.set(0, 0, -3.1);
      scene.add(column2);

      // ---- Floor ----
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.25, metalness: 0.9 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -3.4;
      floor.receiveShadow = true;
      scene.add(floor);

      // ---- Dartboard ----
      const board = new THREE.Group();
      scene.add(board);

      const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
      const SEG = Math.PI / 10;
      const R_OUT = 2.6, R_DOUBLE_O = 2.4, R_DOUBLE_I = 2.28;
      const R_TRIPLE_O = 1.55, R_TRIPLE_I = 1.43;
      const R_BULL_O = 0.34, R_BULL_I = 0.15;

      const BLACK = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
      const TAN   = new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 0.7 });
      const REDM  = new THREE.MeshStandardMaterial({ color: 0xc42a22, roughness: 0.6 });
      const GREEN = new THREE.MeshStandardMaterial({ color: 0x1f7a43, roughness: 0.6 });
      const WIRE  = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.3, metalness: 0.95 });

      const backing = new THREE.Mesh(
        new THREE.CylinderGeometry(R_OUT + 0.12, R_OUT + 0.12, 0.18, 64),
        new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.9 })
      );
      backing.rotation.x = Math.PI / 2;
      backing.position.z = -0.1;
      backing.castShadow = true;
      backing.receiveShadow = true;
      board.add(backing);

      function sector(rIn, rOut, a0, a1, mat, z = 0) {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, rOut, a0, a1, false);
        shape.absarc(0, 0, rIn, a1, a0, true);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 8 });
        const m = new THREE.Mesh(geo, mat);
        m.position.z = z;
        return m;
      }

      for (let i = 0; i < 20; i++) {
        const a0 = i * SEG - SEG / 2 + Math.PI / 2;
        const a1 = a0 + SEG;
        const even = i % 2 === 0;
        board.add(sector(R_BULL_O, R_TRIPLE_I, a0, a1, even ? BLACK : TAN));
        board.add(sector(R_TRIPLE_I, R_TRIPLE_O, a0, a1, even ? GREEN : REDM, 0.01));
        board.add(sector(R_TRIPLE_O, R_DOUBLE_I, a0, a1, even ? BLACK : TAN));
        board.add(sector(R_DOUBLE_I, R_DOUBLE_O, a0, a1, even ? GREEN : REDM, 0.01));
      }

      const bullOuter = new THREE.Mesh(new THREE.CircleGeometry(R_BULL_O, 32), GREEN);
      bullOuter.position.z = 0.02; board.add(bullOuter);
      const bullInner = new THREE.Mesh(new THREE.CircleGeometry(R_BULL_I, 32), REDM);
      bullInner.position.z = 0.03; board.add(bullInner);

      for (let i = 0; i < 20; i++) {
        const a = i * SEG - SEG / 2 + Math.PI / 2;
        const w = new THREE.Mesh(new THREE.BoxGeometry(R_OUT - R_BULL_O, 0.022, 0.07), WIRE);
        w.position.set(Math.cos(a) * ((R_OUT + R_BULL_O) / 2), Math.sin(a) * ((R_OUT + R_BULL_O) / 2), 0.06);
        w.rotation.z = a;
        board.add(w);
      }
      [R_DOUBLE_O, R_DOUBLE_I, R_TRIPLE_O, R_TRIPLE_I, R_BULL_O].forEach((r) => {
        const g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 8, 80), WIRE);
        g.position.z = 0.06; board.add(g);
      });
      const rimWire = new THREE.Mesh(
        new THREE.TorusGeometry(R_OUT, 0.05, 10, 90),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.8 })
      );
      rimWire.position.z = 0.07; board.add(rimWire);

      function numberSprite(num) {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#F3ECD9";
        ctx.font = "bold 84px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(num), 64, 70);
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        s.scale.set(0.5, 0.5, 0.5);
        return s;
      }
      NUMBERS.forEach((num, i) => {
        const a = i * SEG + Math.PI / 2;
        const s = numberSprite(num);
        s.position.set(Math.cos(a) * (R_OUT + 0.32), Math.sin(a) * (R_OUT + 0.32), 0.1);
        board.add(s);
      });

      board.scale.set(0, 0, 0);

      // ---- Dust motes ----
      const moteGeo = new THREE.BufferGeometry();
      const moteN = 120;
      const pos = new Float32Array(moteN * 3);
      for (let i = 0; i < moteN; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
      }
      moteGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: RED, size: 0.04, transparent: true, opacity: 0.5 }));
      scene.add(motes);

      // ---- Interaction ----
      let velocity = 0.005;
      const targetSpeed = 0.005;
      let dragging = false, lastX = 0;
      const dom = renderer.domElement;
      dom.style.cursor = "grab";

      const down = (x) => { dragging = true; lastX = x; dom.style.cursor = "grabbing"; };
      const move = (x) => { if (!dragging) return; velocity += (x - lastX) * 0.0008; lastX = x; };
      const up = () => { dragging = false; dom.style.cursor = "grab"; };

      const onMD = (e) => down(e.clientX);
      const onMM = (e) => { move(e.clientX); mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
      const onMU = () => up();
      const onTS = (e) => down(e.touches[0].clientX);
      const onTM = (e) => move(e.touches[0].clientX);
      const onTE = () => up();

      let mx = 0, my = 0;
      dom.addEventListener("mousedown", onMD);
      window.addEventListener("mousemove", onMM);
      window.addEventListener("mouseup", onMU);
      dom.addEventListener("touchstart", onTS, { passive: true });
      window.addEventListener("touchmove", onTM, { passive: true });
      window.addEventListener("touchend", onTE);

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      // expose burst() so the Enter button can trigger a spin
      apiRef.current.burst = () => { velocity = 0.5; };

      let intro = 0;
      const clock = new THREE.Clock();
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        if (intro < 1) { intro = Math.min(1, intro + 0.02); const e = 1 - Math.pow(1 - intro, 3); board.scale.set(e, e, e); }

        velocity += (targetSpeed - velocity) * 0.02;
        if (!dragging) velocity *= 0.99;
        velocity = Math.max(velocity, 0.002);
        board.rotation.z -= velocity;

        board.position.y = Math.sin(t * 0.8) * 0.08;
        board.rotation.x = -my * 0.25 + Math.sin(t * 0.5) * 0.03;
        board.rotation.y = mx * 0.4;

        colMat.opacity = 0.4 + Math.sin(t * 1.6) * 0.12;
        rim.intensity = 300 + Math.sin(t * 1.6) * 80;
        motes.rotation.y = t * 0.02;

        camera.position.x += (mx * 0.6 - camera.position.x) * 0.04;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      tick();

      setReady(true);

      cleanupFns.push(() => {
        cancelAnimationFrame(animId);
        dom.removeEventListener("mousedown", onMD);
        window.removeEventListener("mousemove", onMM);
        window.removeEventListener("mouseup", onMU);
        dom.removeEventListener("touchstart", onTS);
        window.removeEventListener("touchmove", onTM);
        window.removeEventListener("touchend", onTE);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      });
    }

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    apiRef.current.burst?.();
    setTimeout(() => {
      window.location.replace("/?from=splash");
    }, 750);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050505] text-[#F3ECD9]">
      {/* 3D canvas mounts here */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Loading veil */}
      <div
        className={`absolute inset-0 z-20 grid place-items-center bg-[#050505] transition-opacity duration-700 ${
          ready ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-[#F3ECD9]/15 border-t-[#E51D2A]" />
      </div>

      {/* Overlay UI */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 transition-opacity duration-700 md:p-12 ${
          leaving ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Top brand */}
        <div className="flex items-center gap-3">
          <img
            src="/odc-logo.png"
            alt="ODC"
            className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.5)]"
          />
          <div>
            <p className="text-[17px] font-black leading-none tracking-wide">ODC</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#F3ECD9]/55">Online Darts Circuit</p>
          </div>
        </div>

        {/* Center headline */}
        <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#E51D2A] md:text-[13px]">
            Competitive Online Darts
          </p>
          <h1 className="mt-3 text-5xl font-black leading-[0.92] tracking-tight md:text-8xl">
            Welcome to
            <br />
            the <span className="text-[#E51D2A]">ODC.</span>
          </h1>
        </div>

        {/* Bottom enter */}
        <div className="flex flex-col items-center gap-5">
          <button
            onClick={enter}
            className="pointer-events-auto rounded-full bg-[#E51D2A] px-12 py-[18px] text-[15px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_40px_rgba(229,29,42,0.4)] transition hover:-translate-y-1 hover:shadow-[0_14px_50px_rgba(229,29,42,0.5)]"
          >
            Enter the Circuit
          </button>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#F3ECD9]/40">
            Drag the board to spin · Live tables · Fixtures · Events
          </p>
        </div>
      </div>
    </div>
  );
}
