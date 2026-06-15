"use client";

import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const mountRef = useRef(null);
  const api = useRef({ throwFinal: null });
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("intro"); // intro -> grouping -> aim -> thrown -> leaving
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
          import { EffectComposer } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
          import { RenderPass } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
          import { UnrealBloomPass } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";
          import { ShaderPass } from "https://esm.sh/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js";
          import { RoomEnvironment } from "https://esm.sh/three@0.160.0/examples/jsm/environments/RoomEnvironment.js";
          window.__ODC_THREE__ = { THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, RoomEnvironment };
          window.dispatchEvent(new Event("odc-three-ready"));
        `;
        window.addEventListener("odc-three-ready", () => resolve(window.__ODC_THREE__), { once: true });
        sc.onerror = reject;
        document.head.appendChild(sc);
      });

    const failSafe = setTimeout(() => { if (!disposed) setReady(true); }, 9000);

    loadLibs()
      .then((b) => { if (disposed || !mountRef.current) return; try { init(b); } catch (e) { console.error("init failed", e); setReady(true); } })
      .catch((e) => { console.error("libs failed", e); setReady(true); });

    function init({ THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, RoomEnvironment }) {
      const RED = 0xe51d2a;
      const CREAM = 0xf3ecd9;
      const mount = mountRef.current;
      const W = () => window.innerWidth, H = () => window.innerHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setSize(W(), H());
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050506);
      scene.fog = new THREE.FogExp2(0x050506, 0.03);

      const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 100);
      camera.position.set(0, 0.15, 14);

      // env reflections
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
      scene.environment = envTex;

      // ---- Lights (controlled, not blown out) ----
      scene.add(new THREE.AmbientLight(0x1c1f27, 0.55));
      const key = new THREE.SpotLight(0xfff2e2, 520, 46, Math.PI / 6.5, 0.5, 1.4);
      key.position.set(3, 10, 9); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.radius = 7;
      scene.add(key, key.target);
      const rimRed = new THREE.PointLight(RED, 180, 24, 2);
      rimRed.position.set(0, 0.5, -2.5); scene.add(rimRed);
      const cool = new THREE.DirectionalLight(0x35527e, 0.55);
      cool.position.set(-7, 2, 5); scene.add(cool);

      // ---- Procedural sisal bump ----
      function sisal() {
        const s = 1024, c = document.createElement("canvas"); c.width = c.height = s;
        const x = c.getContext("2d"); x.fillStyle = "#0c0c0c"; x.fillRect(0, 0, s, s);
        for (let i = 0; i < 55000; i++) {
          const px = Math.random() * s, py = Math.random() * s, a = Math.random() * Math.PI, l = 3 + Math.random() * 6, g = 25 + Math.random() * 55;
          x.strokeStyle = `rgba(${g},${g},${g},${0.12 + Math.random() * 0.22})`; x.lineWidth = 0.6 + Math.random() * 0.7;
          x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
        }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
        t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
      }
      const bump = sisal();

      // ---- Board ----
      const board = new THREE.Group();
      board.position.set(0, 0.2, 0);
      scene.add(board);

      const NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
      const SEG = Math.PI / 10;
      const R_OUT = 2.6, R_DBL_O = 2.42, R_DBL_I = 2.3, R_TRP_O = 1.56, R_TRP_I = 1.44, R_BULL_O = 0.34, R_BULL_I = 0.16;
      const DEPTH = 0.18;
      // T20 is the FIRST segment (index 0), centred at top (+Y). Its mid radius:
      const T20R = (R_TRP_O + R_TRP_I) / 2;
      const T20 = new THREE.Vector3(0, T20R, DEPTH + 0.02).add(board.position);

      const mCream = new THREE.MeshStandardMaterial({ color: 0xe9dcb6, roughness: 0.82, metalness: 0.04, bumpMap: bump, bumpScale: 0.05 });
      const mBlack = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.88, metalness: 0.03, bumpMap: bump, bumpScale: 0.05 });
      const mRed = new THREE.MeshStandardMaterial({ color: 0xbe2429, roughness: 0.5, metalness: 0.05, bumpMap: bump, bumpScale: 0.04 });
      const mGreen = new THREE.MeshStandardMaterial({ color: 0x1c7a44, roughness: 0.5, metalness: 0.05, bumpMap: bump, bumpScale: 0.04 });
      const mWire = new THREE.MeshStandardMaterial({ color: 0xd7d7db, roughness: 0.18, metalness: 1.0, envMapIntensity: 1.3 });
      const mRim = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.85 });

      const backing = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT + 0.16, R_OUT + 0.16, DEPTH + 0.06, 96), mRim);
      backing.rotation.x = Math.PI / 2; backing.position.z = -DEPTH / 2; backing.castShadow = backing.receiveShadow = true;
      board.add(backing);

      function sector(rIn, rOut, a0, a1, mat, depth) {
        const sh = new THREE.Shape();
        sh.absarc(0, 0, rOut, a0, a1, false); sh.absarc(0, 0, rIn, a1, a0, true);
        const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1, curveSegments: 12 });
        const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
      }
      for (let i = 0; i < 20; i++) {
        const a0 = i * SEG - SEG / 2 + Math.PI / 2, a1 = a0 + SEG, ev = i % 2 === 0;
        board.add(sector(R_BULL_O, R_TRP_I, a0, a1, ev ? mBlack : mCream, DEPTH * 0.7));
        board.add(sector(R_TRP_I, R_TRP_O, a0, a1, ev ? mGreen : mRed, DEPTH));
        board.add(sector(R_TRP_O, R_DBL_I, a0, a1, ev ? mBlack : mCream, DEPTH * 0.7));
        board.add(sector(R_DBL_I, R_DBL_O, a0, a1, ev ? mGreen : mRed, DEPTH));
      }
      const cyl = (r, h, mat, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat); m.rotation.x = Math.PI / 2; m.position.z = z; m.castShadow = true; return m; };
      board.add(cyl(R_BULL_O, DEPTH * 0.9, mGreen, DEPTH * 0.45));
      board.add(cyl(R_BULL_I, DEPTH, mRed, DEPTH * 0.5));

      const wz = DEPTH + 0.015;
      for (let i = 0; i < 20; i++) {
        const a = i * SEG - SEG / 2 + Math.PI / 2, len = R_OUT - R_BULL_O;
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, len, 8), mWire);
        w.position.set(Math.cos(a) * ((R_OUT + R_BULL_O) / 2), Math.sin(a) * ((R_OUT + R_BULL_O) / 2), wz);
        w.rotation.z = a - Math.PI / 2; w.rotation.x = Math.PI / 2; board.add(w);
      }
      [R_DBL_O, R_DBL_I, R_TRP_O, R_TRP_I, R_BULL_O].forEach((r) => { const g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 12, 120), mWire); g.position.z = wz; board.add(g); });
      const outer = new THREE.Mesh(new THREE.TorusGeometry(R_OUT, 0.05, 16, 128), mRim); outer.position.z = wz; board.add(outer);

      // number band
      function band() {
        const s = 2048, c = document.createElement("canvas"); c.width = s; c.height = 256;
        const x = c.getContext("2d");
        const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#191919"); g.addColorStop(0.5, "#070707"); g.addColorStop(1, "#191919");
        x.fillStyle = g; x.fillRect(0, 0, s, 256);
        x.font = "900 150px Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
        x.shadowColor = "rgba(0,0,0,0.9)"; x.shadowBlur = 8;
        for (let i = 0; i < 20; i++) { x.fillStyle = "#f3ecd9"; x.fillText(String(NUMS[i]), (i + 0.5) * (s / 20), 132); }
        const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
      }
      const bMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(R_OUT + 0.34, R_OUT + 0.34, 0.5, 128, 1, true),
        new THREE.MeshStandardMaterial({ map: band(), roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide })
      );
      bMesh.rotation.x = Math.PI / 2; bMesh.rotation.y = Math.PI / 2; bMesh.position.z = wz - 0.02; board.add(bMesh);

      board.scale.setScalar(0.001);

      // wall + floor + glow column
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(70, 46), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.96 }));
      wall.position.z = -1.4; wall.receiveShadow = true; scene.add(wall);
      const colMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
      const column = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 34), colMat); column.position.set(0, 0, -2.4); scene.add(column);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.14, metalness: 0.92, envMapIntensity: 0.55 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -3.6; floor.receiveShadow = true; scene.add(floor);

      // dust
      const dN = 200, dg = new THREE.BufferGeometry(), dp = new Float32Array(dN * 3);
      for (let i = 0; i < dN; i++) { dp[i*3]=(Math.random()-0.5)*18; dp[i*3+1]=(Math.random()-0.5)*12; dp[i*3+2]=(Math.random()-0.5)*8+1; }
      dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xff8a7a, size: 0.03, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(dust);

      // ---- Dart factory ----
      function makeDart() {
        const g = new THREE.Group();
        const steel = new THREE.MeshStandardMaterial({ color: 0xcfcfd4, roughness: 0.2, metalness: 1 });
        const tung = new THREE.MeshStandardMaterial({ color: 0x37373b, roughness: 0.35, metalness: 0.95 });
        const carbon = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.5, metalness: 0.3 });
        const fl = new THREE.MeshStandardMaterial({ color: 0xbe2429, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.3, 16), steel); tip.rotation.z = -Math.PI/2; tip.position.x = 0.45; g.add(tip);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.043, 0.5, 20), tung); barrel.rotation.z = Math.PI/2; barrel.position.x = 0.12; g.add(barrel);
        for (let i=0;i<9;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(0.049,0.0035,6,18),steel); r.rotation.y=Math.PI/2; r.position.x=-0.05+i*0.05; g.add(r); }
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.4,12),carbon); shaft.rotation.z=Math.PI/2; shaft.position.x=-0.28; g.add(shaft);
        for (let i=0;i<4;i++){ const v=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.24),fl); v.position.x=-0.6; const grp=new THREE.Group(); grp.add(v); grp.rotation.x=(i*Math.PI)/2; grp.position.x=-0.6; g.add(grp); }
        g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        return g;
      }

      // three darts that auto-fly into T20 grouping
      const groupTargets = [
        new THREE.Vector3(-0.1, T20R + 0.04, DEPTH + 0.18).add(new THREE.Vector3(0,0.2,0)),
        new THREE.Vector3(0.08, T20R - 0.02, DEPTH + 0.18).add(new THREE.Vector3(0,0.2,0)),
        new THREE.Vector3(0.0, T20R - 0.08, DEPTH + 0.18).add(new THREE.Vector3(0,0.2,0)),
      ];
      const darts = groupTargets.map((tg) => { const o = makeDart(); o.visible = false; o.scale.setScalar(0.4); scene.add(o); return { o, tg, phase: "idle", t: 0 }; });
      const fromL = new THREE.Vector3(-8, -1.2, 10);

      // final user dart (flies from camera POV)
      const finalDart = makeDart(); finalDart.visible = false; finalDart.scale.setScalar(0.4); scene.add(finalDart);
      const finalTarget = new THREE.Vector3(0.02, T20R + 0.0, DEPTH + 0.2).add(new THREE.Vector3(0,0.2,0));

      // impact flash sprites
      function flashSprite() {
        const c = document.createElement("canvas"); c.width=c.height=128; const x=c.getContext("2d");
        const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,"rgba(255,245,210,1)"); g.addColorStop(0.4,"rgba(229,29,42,0.55)"); g.addColorStop(1,"rgba(229,29,42,0)");
        x.fillStyle=g; x.fillRect(0,0,128,128);
        const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
        s.visible=false; s.scale.setScalar(0.5); scene.add(s); return s;
      }
      const flashes = [flashSprite(), flashSprite(), flashSprite(), flashSprite()];
      const flashLife = [0,0,0,0];
      let shake = 0, hitGlow = 0;

      // ---- Post ----
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.32, 0.55, 0.9);
      composer.addPass(bloom);
      const grain = {
        uniforms: { tDiffuse:{value:null}, uTime:{value:0}, uAmt:{value:0.05}, uVig:{value:1.1}, uAb:{value:0.0014}, uFlash:{value:0} },
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
            col=mix(col, vec3(1.0), uFlash); // white flash on entry
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

      // sequence state machine
      let seq = "intro"; // intro -> grouping -> aim -> thrown -> done
      let introT = 0;
      const dartTimers = [];

      function startGrouping() {
        seq = "grouping"; setPhase("grouping");
        dartTimers.push(setTimeout(()=>launch(0), 200));
        dartTimers.push(setTimeout(()=>launch(1), 900));
        dartTimers.push(setTimeout(()=>launch(2), 1600));
        // after 3rd lands, go to aim
        dartTimers.push(setTimeout(()=>{ seq="aim"; setPhase("aim"); }, 2600));
      }
      function launch(i){ if(darts[i].phase!=="idle")return; darts[i].phase="flying"; darts[i].t=0; darts[i].o.visible=true; }

      let finalPhase = "idle", finalT = 0;
      function throwFinal() {
        if (seq !== "aim" || finalPhase !== "idle") return;
        seq = "thrown"; setPhase("thrown");
        finalPhase = "flying"; finalT = 0; finalDart.visible = true;
      }
      api.current.throwFinal = throwFinal;

      const clock = new THREE.Clock();
      const tmp = new THREE.Vector3();
      let animId;
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        // intro: board scales up + camera pushes in, then start grouping
        if (seq === "intro") {
          introT += 0.012;
          const e = 1 - Math.pow(1 - Math.min(introT,1), 4);
          board.scale.setScalar(0.001 + e * 0.999);
          if (introT >= 1) startGrouping();
        }

        // camera push-in to 12, with handheld sway + parallax
        const baseZ = 12;
        camera.position.z += (baseZ - camera.position.z) * 0.02;
        const swayX = Math.sin(t*0.6)*0.06 + mx*0.6;
        const swayY = Math.cos(t*0.5)*0.04 - my*0.4 + 0.15;
        camera.position.x += (swayX - camera.position.x) * 0.05;
        camera.position.y += (swayY - camera.position.y) * 0.05;
        // screen shake
        if (shake > 0) { camera.position.x += (Math.random()-0.5)*shake; camera.position.y += (Math.random()-0.5)*shake; shake *= 0.85; }
        camera.lookAt(0, 0.2, 0);

        // glow / light life
        colMat.opacity = 0.12 + Math.sin(t*1.4)*0.04 + hitGlow*0.25;
        rimRed.intensity = 170 + Math.sin(t*1.4)*40 + hitGlow*400;
        bloom.strength = 0.32 + hitGlow*0.35;
        hitGlow = Math.max(0, hitGlow - 0.04);
        dust.rotation.y = t*0.012;

        // grouping darts
        for (let i=0;i<darts.length;i++){
          const d=darts[i];
          if (d.phase==="flying"){
            d.t += 0.03;
            const tt=Math.min(d.t,1), e=tt*tt*(3-2*tt);
            tmp.lerpVectors(fromL, d.tg, e); tmp.y += Math.sin(tt*Math.PI)*1.0;
            d.o.position.copy(tmp); d.o.scale.setScalar(0.4+e*0.28);
            d.o.lookAt(d.tg.x, d.tg.y+0.0001, d.tg.z+1); d.o.rotateY(Math.PI/2);
            if (d.t>=1){ d.phase="stuck"; d.o.position.copy(d.tg); flashes[i].position.copy(d.tg); flashes[i].visible=true; flashLife[i]=1; shake=0.12; hitGlow=1; }
          }
        }

        // final dart from camera POV
        if (finalPhase==="flying"){
          finalT += 0.045;
          const tt=Math.min(finalT,1), e=tt*tt*(3-2*tt);
          // start near camera
          const start = new THREE.Vector3(camera.position.x*0.3, camera.position.y-0.3, camera.position.z-1.5);
          tmp.lerpVectors(start, finalTarget, e);
          finalDart.position.copy(tmp);
          finalDart.scale.setScalar(0.6 - e*0.2);
          finalDart.lookAt(finalTarget.x, finalTarget.y+0.0001, finalTarget.z+1); finalDart.rotateY(Math.PI/2);
          if (finalT>=1){
            finalPhase="done"; finalDart.position.copy(finalTarget);
            flashes[3].position.copy(finalTarget); flashes[3].visible=true; flashLife[3]=1; shake=0.25; hitGlow=1.4;
            // white flash + redirect
            let f=0; const flashIv=setInterval(()=>{ f+=0.08; grainPass.uniforms.uFlash.value=Math.min(f,1); if(f>=1){ clearInterval(flashIv); window.location.replace("/?from=splash"); } }, 16);
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
      setReady(true);

      cleanups.push(() => {
        cancelAnimationFrame(animId);
        dartTimers.forEach(clearTimeout);
        window.removeEventListener("mousemove", onMM);
        window.removeEventListener("resize", onResize);
        pmrem.dispose(); composer.dispose?.(); renderer.dispose();
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

      {/* Brand top-left */}
      <div className="pointer-events-none absolute left-6 top-6 z-20 flex items-center gap-3 md:left-12 md:top-12">
        <img src="/odc-logo.png" alt="ODC" className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(229,29,42,0.5)]" />
        <div>
          <p className="text-[17px] font-black leading-none tracking-wide">ODC</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#F3ECD9]/55">Online Darts Circuit</p>
        </div>
      </div>

      {/* Headline — fades out once aiming begins */}
      <div className={`pointer-events-none absolute left-1/2 top-[18%] z-20 w-full -translate-x-1/2 text-center transition-opacity duration-700 ${phase === "intro" || phase === "grouping" ? "opacity-100" : "opacity-0"}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#E51D2A] md:text-[13px]">Competitive Online Darts</p>
        <h1 className="mt-2 text-4xl font-black leading-[0.9] tracking-tight md:text-7xl" style={{ textShadow: "0 8px 60px rgba(0,0,0,0.8)" }}>
          Welcome to the <span className="text-[#E51D2A]">ODC.</span>
        </h1>
      </div>

      {/* AIM prompt — appears after the 3 darts land */}
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
