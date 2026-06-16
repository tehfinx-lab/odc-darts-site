"use client";

import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const mountRef = useRef(null);
  const api = useRef({ throwFinal: null });
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("loading"); // loading -> intro -> grouping -> aim -> thrown
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let disposed = false;
    const cleanups = [];

    const loadLibs = () =>
      new Promise((resolve, reject) => {
        if (window.__ODC_THREE__) return resolve(window.__ODC_THREE__);
        const sc = document.createElement("script");
        sc.type = "module";
        sc.textContent = `
          import * as THREE from "https://esm.sh/three@0.160.0";
          import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
          import { DRACOLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
          import { EffectComposer } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
          import { RenderPass } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
          import { UnrealBloomPass } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";
          import { ShaderPass } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js";
          import { RoomEnvironment } from "https://esm.sh/three@0.160.0/examples/jsm/environments/RoomEnvironment.js";
          window.__ODC_THREE__ = { THREE, GLTFLoader, DRACOLoader, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, RoomEnvironment };
          window.dispatchEvent(new Event("odc-three-ready"));
        `;
        window.addEventListener("odc-three-ready", () => resolve(window.__ODC_THREE__), { once: true });
        sc.onerror = reject;
        document.head.appendChild(sc);
      });

    const failSafe = setTimeout(() => { if (!disposed) setReady(true); }, 15000);

    loadLibs()
      .then((b) => { if (disposed || !mountRef.current) return; init(b); })
      .catch((e) => { console.error("libs failed", e); setReady(true); });

    function init({ THREE, GLTFLoader, DRACOLoader, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, RoomEnvironment }) {
      const RED = 0xe51d2a;
      const mount = mountRef.current;
      const W = () => window.innerWidth, H = () => window.innerHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setSize(W(), H());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050506);
      scene.fog = new THREE.FogExp2(0x050506, 0.025);

      const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 100);
      camera.position.set(0, 0.15, 14);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
      scene.environment = envTex;

      // ---- Lights ----
      scene.add(new THREE.AmbientLight(0x1c1f27, 0.5));
      const key = new THREE.SpotLight(0xfff2e2, 600, 50, Math.PI / 6, 0.5, 1.3);
      key.position.set(3, 10, 9); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.radius = 7;
      scene.add(key, key.target);
      const rimRed = new THREE.PointLight(RED, 160, 26, 2);
      rimRed.position.set(0, 0.5, -2.5); scene.add(rimRed);
      const cool = new THREE.DirectionalLight(0x35527e, 0.5);
      cool.position.set(-7, 2, 5); scene.add(cool);
      const frontFill = new THREE.DirectionalLight(0xffffff, 0.45);
      frontFill.position.set(0, 1, 12); scene.add(frontFill);

      // ---- Wall / floor / glow column ----
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.96 }));
      wall.position.z = -1.6; wall.receiveShadow = true; scene.add(wall);
      const colMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
      const column = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 34), colMat); column.position.set(0, 0, -2.5); scene.add(column);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.15, metalness: 0.9, envMapIntensity: 0.5 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -3.6; floor.receiveShadow = true; scene.add(floor);

      // dust
      const dN = 200, dg = new THREE.BufferGeometry(), dp = new Float32Array(dN * 3);
      for (let i = 0; i < dN; i++) { dp[i*3]=(Math.random()-0.5)*18; dp[i*3+1]=(Math.random()-0.5)*12; dp[i*3+2]=(Math.random()-0.5)*8+1; }
      dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xff8a7a, size: 0.03, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(dust);

      // ---- Loaders (Draco) ----
      const draco = new DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
      const gltf = new GLTFLoader();
      gltf.setDRACOLoader(draco);

      // Board target geometry constants (filled after load)
      const BOARD_RADIUS = 2.6;          // visual radius after we scale it
      let T20 = new THREE.Vector3(0, BOARD_RADIUS * 0.86, 0.0); // treble 20 world pos (approx, refined after load)
      const board = new THREE.Group();
      board.position.set(0, 0.2, 0);
      board.scale.setScalar(0.001);
      scene.add(board);

      // ---- Dart material factory (STL has no materials) ----
      function styleDart(obj) {
        // Dart long axis is Z, tip at -Z, flights at +Z. Colour by vertex Z via material groups.
        const steel = new THREE.MeshStandardMaterial({ color: 0xe2e2e6, roughness: 0.18, metalness: 1.0, envMapIntensity: 1.4 });
        const tungsten = new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.32, metalness: 0.96, envMapIntensity: 1.0 });
        const red = new THREE.MeshStandardMaterial({ color: 0xe51d2a, roughness: 0.4, metalness: 0.15, emissive: 0x3a0507, emissiveIntensity: 0.3 });
        obj.traverse((o) => {
          if (o.isMesh && o.geometry) {
            o.castShadow = true;
            const geo = o.geometry;
            geo.computeBoundingBox();
            const zmin = geo.boundingBox.min.z, zmax = geo.boundingBox.max.z, span = zmax - zmin || 1;
            const pos = geo.attributes.position;
            // assign material index per triangle based on average Z
            geo.clearGroups();
            const idx = geo.index;
            const triCount = idx ? idx.count / 3 : pos.count / 3;
            // build a material array and groups
            const getZ = (vi) => pos.getZ(vi);
            for (let t = 0; t < triCount; t++) {
              let a,b,c;
              if (idx) { a=idx.getX(t*3); b=idx.getX(t*3+1); c=idx.getX(t*3+2); }
              else { a=t*3; b=t*3+1; c=t*3+2; }
              const az = (getZ(a)+getZ(b)+getZ(c))/3;
              const frac = (az - zmin) / span; // 0 at tip(-Z) .. 1 at flights(+Z)
              let mi = 1; // tungsten barrel default
              if (frac < 0.28) mi = 0;        // tip = steel
              else if (frac > 0.72) mi = 2;   // flights = red
              geo.addGroup(t*3, 3, mi);
            }
            o.material = [steel, tungsten, red];
          }
        });
        return obj;
      }
      // We only have ONE dart mesh; clone it. It's a single STL so the whole thing is steel —
      // to add colour we tint via a second material pass on the rear third (flights) using vertex Z.
      function makeDart(template) {
        const d = template.clone(true);
        styleDart(d);
        return d;
      }

      let dartTemplate = null;
      let boardLoaded = false, dartLoaded = false;
      const checkReady = () => {
        if (boardLoaded && dartLoaded) {
          setReady(true);
          setPhase("intro");
          startSequence();
        }
      };

      // ---- Load BOARD ----
      gltf.load(
        "/models/board.glb",
        (g) => {
          const model = g.scene;
          // Compute bbox to normalise size + stand upright
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3(); box.getSize(size);
          const center = new THREE.Vector3(); box.getCenter(center);
          model.position.sub(center); // center at origin

          // Board lies flat (Y is thin). Stand it up so face points +Z toward camera.
          model.rotation.x = Math.PI / 2;

          // Scale so the board diameter == 2*BOARD_RADIUS
          const flatDiameter = Math.max(size.x, size.z);
          const s = (BOARD_RADIUS * 2) / flatDiameter;
          model.scale.setScalar(s);

          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.material) {
                o.material.envMapIntensity = 0.8;
                o.material.roughness = Math.min(1, (o.material.roughness ?? 1) * 1.0);
              }
            }
          });

          board.add(model);
          // refine T20 in board-local space: top of board face, ~86% out
          T20 = new THREE.Vector3(0, BOARD_RADIUS * 0.84, 0.12).add(board.position);
          boardLoaded = true;
          checkReady();
        },
        undefined,
        (err) => { console.error("board load failed", err); boardLoaded = true; checkReady(); }
      );

      // ---- Load DART ----
      gltf.load(
        "/models/dart.glb",
        (g) => {
          const model = g.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3(); box.getCenter(center);
          model.position.sub(center);
          // dart long axis is Z, tip at -Z. Scale to a sensible length (~0.95 world units)
          const size = new THREE.Vector3(); box.getSize(size);
          const len = Math.max(size.x, size.y, size.z);
          model.scale.setScalar(1.3 / len);
          styleDart(model);
          dartTemplate = model;
          dartLoaded = true;
          checkReady();
        },
        undefined,
        (err) => { console.error("dart load failed", err); dartLoaded = true; checkReady(); }
      );

      // ---- Darts state ----
      // 2 auto darts + 1 user dart. Targets cluster in treble 20.
      const groupTargets = [
        () => new THREE.Vector3(-0.12, 0, 0.05).add(T20),
        () => new THREE.Vector3(0.10, -0.04, 0.05).add(T20),
      ];
      const autoDarts = [];
      const fromL = new THREE.Vector3(-8, -1.2, 10);

      let userDart = null;
      const finalTargetFn = () => new THREE.Vector3(0.0, 0.02, 0.06).add(T20);

      // impact flashes
      function flashSprite() {
        const c = document.createElement("canvas"); c.width=c.height=128; const x=c.getContext("2d");
        const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,"rgba(255,245,210,1)"); g.addColorStop(0.4,"rgba(229,29,42,0.55)"); g.addColorStop(1,"rgba(229,29,42,0)");
        x.fillStyle=g; x.fillRect(0,0,128,128);
        const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
        s.visible=false; s.scale.setScalar(0.5); scene.add(s); return s;
      }
      const flashes = [flashSprite(), flashSprite(), flashSprite()];
      const flashLife = [0,0,0];
      let shake = 0, hitGlow = 0;

      // ---- Post ----
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.3, 0.55, 0.92);
      composer.addPass(bloom);
      const grain = {
        uniforms: { tDiffuse:{value:null}, uTime:{value:0}, uAmt:{value:0.045}, uVig:{value:1.1}, uAb:{value:0.0013}, uFlash:{value:0} },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float uTime,uAmt,uVig,uAb,uFlash; varying vec2 vUv;
          float rand(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
          void main(){
            vec2 uv=vUv; vec2 d=uv-0.5;
            float r=texture2D(tDiffuse,uv+d*uAb).r, g=texture2D(tDiffuse,uv).g, b=texture2D(tDiffuse,uv-d*uAb).b;
            vec3 col=vec3(r,g,b);
            col*=smoothstep(uVig,0.32,length(d));
            col+=(rand(uv+fract(uTime))-0.5)*uAmt;
            col=mix(col, vec3(1.0), uFlash);
            gl_FragColor=vec4(col,1.0);
          }`,
      };
      const grainPass = new ShaderPass(grain); composer.addPass(grainPass);

      // ---- Interaction ----
      let mx=0,my=0;
      const dom = renderer.domElement;
      const onMM=(e)=>{ mx=e.clientX/W()-0.5; my=e.clientY/H()-0.5; };
      window.addEventListener("mousemove", onMM);
      const onResize=()=>{ camera.aspect=W()/H(); camera.updateProjectionMatrix(); renderer.setSize(W(),H()); composer.setSize(W(),H()); };
      window.addEventListener("resize", onResize);

      // ---- Sequence ----
      let seq = "intro", introT = 0;
      const timers = [];
      function startSequence() {
        if (seq === "running") return;
        seq = "running";
      }
      function spawnAuto(i) {
        if (!dartTemplate) return;
        const d = makeDart(dartTemplate);
        d.visible = true;
        scene.add(d);
        autoDarts.push({ obj: d, tg: groupTargets[i](), t: 0, phase: "flying", idx: i });
      }
      // schedule after intro completes (handled in tick when introT done)
      let scheduled = false;
      function scheduleDarts() {
        if (scheduled) return; scheduled = true;
        timers.push(setTimeout(() => spawnAuto(0), 300));
        timers.push(setTimeout(() => spawnAuto(1), 1100));
        timers.push(setTimeout(() => { seq = "aim"; setPhase("aim"); }, 2100));
      }

      let finalPhase = "idle", finalT = 0;
      function throwFinal() {
        if (seq !== "aim" || finalPhase !== "idle" || !dartTemplate) return;
        seq = "thrown"; setPhase("thrown");
        userDart = makeDart(dartTemplate);
        userDart.visible = true;
        scene.add(userDart);
        finalPhase = "flying"; finalT = 0;
      }
      api.current.throwFinal = throwFinal;

      const clock = new THREE.Clock();
      const tmp = new THREE.Vector3();
      let animId;

      // helper: aim a dart object so tip (-Z) points at target
      function aimDart(obj, target) {
        obj.lookAt(target);   // -Z faces target by default for lookAt? No: +Z faces target.
        // Our dart tip is at -Z, so rotate 180° around Y so tip leads.
        obj.rotateY(Math.PI);
      }

      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        // intro scale-up
        if (seq === "running") {
          introT += 0.012;
          const e = 1 - Math.pow(1 - Math.min(introT,1), 4);
          board.scale.setScalar(0.001 + e * 0.999);
          if (introT >= 1) scheduleDarts();
        }

        // camera push-in + sway + parallax
        const baseZ = 11.5;
        camera.position.z += (baseZ - camera.position.z) * 0.02;
        const swayX = Math.sin(t*0.6)*0.05 + mx*0.6;
        const swayY = Math.cos(t*0.5)*0.035 - my*0.4 + 0.15;
        camera.position.x += (swayX - camera.position.x) * 0.05;
        camera.position.y += (swayY - camera.position.y) * 0.05;
        if (shake > 0) { camera.position.x += (Math.random()-0.5)*shake; camera.position.y += (Math.random()-0.5)*shake; shake *= 0.85; }
        camera.lookAt(0, 0.2, 0);

        // glow / light life
        colMat.opacity = 0.1 + Math.sin(t*1.4)*0.035 + hitGlow*0.22;
        rimRed.intensity = 150 + Math.sin(t*1.4)*35 + hitGlow*380;
        bloom.strength = 0.3 + hitGlow*0.3;
        hitGlow = Math.max(0, hitGlow - 0.04);
        dust.rotation.y = t*0.012;

        // auto darts flight
        for (let i=0;i<autoDarts.length;i++){
          const d=autoDarts[i];
          if (d.phase==="flying"){
            d.t += 0.03;
            const tt=Math.min(d.t,1), e=tt*tt*(3-2*tt);
            tmp.lerpVectors(fromL, d.tg, e); tmp.y += Math.sin(tt*Math.PI)*1.0;
            d.obj.position.copy(tmp);
            aimDart(d.obj, d.tg);
            if (d.t>=1){ d.phase="stuck"; d.obj.position.copy(d.tg); const fi=d.idx; flashes[fi].position.copy(d.tg); flashes[fi].visible=true; flashLife[fi]=1; shake=0.1; hitGlow=1; }
          }
        }

        // user dart flight (from camera POV)
        if (finalPhase==="flying" && userDart){
          finalT += 0.04;
          const tt=Math.min(finalT,1), e=tt*tt*(3-2*tt);
          const target = finalTargetFn();
          const start = new THREE.Vector3(camera.position.x*0.3, camera.position.y-0.25, camera.position.z-1.4);
          tmp.lerpVectors(start, target, e);
          userDart.position.copy(tmp);
          aimDart(userDart, target);
          if (finalT>=1){
            finalPhase="done"; userDart.position.copy(target);
            flashes[2].position.copy(target); flashes[2].visible=true; flashLife[2]=1; shake=0.22; hitGlow=1.4;
            let f=0; const fv=setInterval(()=>{ f+=0.08; grainPass.uniforms.uFlash.value=Math.min(f,1); if(f>=1){ clearInterval(fv); window.location.replace("/?from=splash"); } }, 16);
          }
        }

        // flashes fade
        for (let i=0;i<flashes.length;i++){
          if (flashLife[i]>0){ flashLife[i]-=0.06; flashes[i].material.opacity=Math.max(0,flashLife[i]); flashes[i].scale.setScalar(0.5+(1-flashLife[i])*1.1); if(flashLife[i]<=0) flashes[i].visible=false; }
        }

        grainPass.uniforms.uTime.value = t;
        composer.render();
      };
      tick();

      cleanups.push(() => {
        cancelAnimationFrame(animId);
        timers.forEach(clearTimeout);
        window.removeEventListener("mousemove", onMM);
        window.removeEventListener("resize", onResize);
        draco.dispose?.(); pmrem.dispose(); composer.dispose?.(); renderer.dispose();
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      });
    }

    return () => { disposed = true; clearTimeout(failSafe); cleanups.forEach((fn) => fn()); };
  }, []);

  const onClickThrow = () => {
    if (phase !== "aim" || leaving) return;
    setLeaving(true);
    api.current.throwFinal?.();
  };

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-[#050506] text-[#F3ECD9] ${phase === "aim" ? "cursor-crosshair" : "cursor-default"}`}
      onClick={onClickThrow}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* Loading veil */}
      <div className={`absolute inset-0 z-30 grid place-items-center bg-[#050506] transition-opacity duration-700 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-[#F3ECD9]/15 border-t-[#E51D2A]" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#F3ECD9]/40">Loading the oche</p>
        </div>
      </div>

      {/* Brand */}
      <div className="pointer-events-none absolute left-6 top-6 z-20 flex items-center gap-3 md:left-12 md:top-12">
        <img src="/odc-logo.png" alt="ODC" className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.5)]" />
        <div>
          <p className="text-[17px] font-black leading-none tracking-wide">ODC</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#F3ECD9]/55">Online Darts Circuit</p>
        </div>
      </div>

      {/* Headline */}
      <div className={`pointer-events-none absolute left-1/2 top-[16%] z-20 w-full -translate-x-1/2 text-center transition-opacity duration-700 ${phase === "intro" || phase === "grouping" || phase === "running" ? "opacity-100" : "opacity-0"}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#E51D2A] md:text-[13px]">Competitive Online Darts</p>
        <h1 className="mt-2 text-4xl font-black leading-[0.9] tracking-tight md:text-7xl" style={{ textShadow: "0 8px 60px rgba(0,0,0,0.8)" }}>
          Welcome to the <span className="text-[#E51D2A]">ODC.</span>
        </h1>
      </div>

      {/* Aim prompt */}
      <div className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-end pb-16 transition-opacity duration-500 ${phase === "aim" ? "opacity-100" : "opacity-0"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-16 w-16">
            <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#E51D2A]/60" />
            <span className="absolute inset-2 rounded-full border-2 border-[#E51D2A]" />
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E51D2A]" />
          </div>
          <p className="text-lg font-black uppercase tracking-[0.3em] text-[#F3ECD9] md:text-2xl">Throw to Enter</p>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#F3ECD9]/45">Click to land your final dart in the treble 20</p>
        </div>
      </div>
    </div>
  );
}