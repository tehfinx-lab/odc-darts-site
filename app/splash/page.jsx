"use client";
import { useEffect, useRef, useState } from "react";

export default function Splash() {
  const canvasRef = useRef(null);
  const [hint, setHint] = useState(true);
  const [thrown, setThrown] = useState(false);

  useEffect(() => {
    setTimeout(() => setHint(false), 3000);
  }, []);


  useEffect(() => {

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let animId;
    let particles = [];

    let cx, cy, r;


    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      cx = canvas.width / 2;
      cy = canvas.height / 2;

      // slightly smaller for realistic spacing
      r = Math.min(
        canvas.width,
        canvas.height
      ) * 0.29;
    };


    resize();
    window.addEventListener(
      "resize",
      resize
    );


    const SEG = [
      20,1,18,4,13,
      6,10,15,2,17,
      3,19,7,16,8,
      11,14,9,12,5
    ];



    // ============================
    // ULTRA REALISTIC DARTBOARD
    // ============================

    const drawBoard = () => {


      const SA =
        -Math.PI / 2 -
        Math.PI / 20;



      // Room lighting glow

      const room =
      ctx.createRadialGradient(
        cx,
        cy-r*0.6,
        0,
        cx,
        cy,
        r*2
      );


      room.addColorStop(
        0,
        "rgba(80,40,10,.35)"
      );

      room.addColorStop(
        .4,
        "rgba(20,8,3,.25)"
      );


      room.addColorStop(
        1,
        "rgba(0,0,0,0)"
      );


      ctx.fillStyle = room;

      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );




      // =====================
      // WOOD SURROUND
      // =====================


      const wood =
      ctx.createRadialGradient(
        cx-r*.25,
        cy-r*.3,
        r*.25,
        cx,
        cy,
        r*1.25
      );


      wood.addColorStop(0,"#8c4a19");
      wood.addColorStop(.25,"#5a2a0d");
      wood.addColorStop(.7,"#221005");
      wood.addColorStop(1,"#050200");


      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        r*1.23,
        0,
        Math.PI*2
      );


      ctx.fillStyle = wood;
      ctx.fill();



      // Real wood grain


      for(
        let i=0;
        i<4000;
        i++
      ){

        let a =
          Math.random()
          *Math.PI*2;


        let d =
          r +
          Math.random()
          *r*.25;


        let x =
          cx +
          Math.cos(a)*d;


        let y =
          cy +
          Math.sin(a)*d;


        ctx.fillStyle =
          `rgba(
            220,
            120,
            60,
            ${
              Math.random()
              *0.04
            }
          )`;


        ctx.fillRect(
          x,
          y,
          Math.random()*3,
          .5
        );

      }

            // =====================
      // BOARD SEGMENTS
      // =====================

      const zones = [
        [1.0, .93, "#b01216", "#145f2f"],
        [.93, .75, "#151515", "#d6c8a5"],
        [.75, .62, "#b01216", "#145f2f"],
        [.62, .16, "#151515", "#d6c8a5"]
      ];


      zones.forEach(([outer, inner, red, cream]) => {

        for(let i = 0; i < 20; i++){

          const a1 =
            SA + i * Math.PI * 2 / 20;

          const a2 =
            SA + (i+1) * Math.PI * 2 / 20;


          ctx.beginPath();

          ctx.arc(
            cx,
            cy,
            r * outer,
            a1,
            a2
          );


          ctx.arc(
            cx,
            cy,
            r * inner,
            a2,
            a1,
            true
          );


          ctx.closePath();


          ctx.fillStyle =
            i % 2 === 0
            ? red
            : cream;


          ctx.fill();


          // subtle dirty edge
          ctx.strokeStyle =
            "rgba(0,0,0,.18)";


          ctx.lineWidth =
            r * .003;


          ctx.stroke();

        }

      });



      // =====================
      // SISAL FIBRE TEXTURE
      // =====================


      ctx.save();

      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        r,
        0,
        Math.PI*2
      );

      ctx.clip();


      for(let i=0; i<30000; i++){

        const a =
          Math.random() * Math.PI * 2;


        const d =
          Math.random() * r;


        const x =
          cx + Math.cos(a) * d;


        const y =
          cy + Math.sin(a) * d;


        const len =
          Math.random() * 4;


        ctx.strokeStyle =
          Math.random() > .5
          ? "rgba(255,255,220,.07)"
          : "rgba(0,0,0,.09)";


        ctx.lineWidth = .35;


        ctx.beginPath();

        ctx.moveTo(
          x,
          y
        );


        ctx.lineTo(
          x + Math.cos(a)*len,
          y + Math.sin(a)*len
        );


        ctx.stroke();

      }


      ctx.restore();



      // =====================
      // THIN SPIDER WIRES
      // =====================


      ctx.shadowColor =
        "black";


      ctx.shadowBlur =
        4;


      ctx.strokeStyle =
        "#cfcfcf";


      ctx.lineWidth =
        r * .0025;



      [
        1,
        .93,
        .75,
        .62,
        .16
      ]
      .forEach(rad => {


        ctx.beginPath();


        ctx.arc(
          cx,
          cy,
          r * rad,
          0,
          Math.PI*2
        );


        ctx.stroke();


      });




      // radial dividers


      for(let i=0; i<20; i++){


        const a =
          SA + i * Math.PI * 2 / 20;


        ctx.beginPath();


        ctx.moveTo(
          cx + Math.cos(a)*r*.16,
          cy + Math.sin(a)*r*.16
        );


        ctx.lineTo(
          cx + Math.cos(a)*r,
          cy + Math.sin(a)*r
        );


        ctx.stroke();


      }



      ctx.shadowBlur = 0;



      // =====================
      // METAL NUMBER RING
      // =====================


      for(let i=0; i<20; i++){


        const a =
          SA + (i+.5)
          * Math.PI*2/20;


        const x =
          cx + Math.cos(a)*r*1.08;


        const y =
          cy + Math.sin(a)*r*1.08;


        ctx.font =
          `900 ${r*.11}px Arial Black`;


        ctx.textAlign =
          "center";


        ctx.textBaseline =
          "middle";


        // dark shadow

        ctx.fillStyle =
          "#000";


        ctx.fillText(
          SEG[i],
          x+3,
          y+3
        );


        // metal finish

        const metal =
          ctx.createLinearGradient(
            x,
            y-r*.05,
            x,
            y+r*.05
          );


        metal.addColorStop(
          0,
          "#ffffff"
        );


        metal.addColorStop(
          .4,
          "#dddddd"
        );


        metal.addColorStop(
          1,
          "#555555"
        );


        ctx.fillStyle =
          metal;


        ctx.fillText(
          SEG[i],
          x,
          y
        );

      }
            // =====================
      // BULL (25)
      // =====================

      const outerBull =
        ctx.createRadialGradient(
          cx-r*.02,
          cy-r*.02,
          0,
          cx,
          cy,
          r*.16
        );


      outerBull.addColorStop(0,"#35c665");
      outerBull.addColorStop(.6,"#166b33");
      outerBull.addColorStop(1,"#092e15");


      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        r*.16,
        0,
        Math.PI*2
      );

      ctx.fillStyle = outerBull;
      ctx.fill();


      // Bullseye

      const bull =
        ctx.createRadialGradient(
          cx-r*.015,
          cy-r*.015,
          0,
          cx,
          cy,
          r*.07
        );


      bull.addColorStop(0,"#ff5050");
      bull.addColorStop(.5,"#c61111");
      bull.addColorStop(1,"#540000");


      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        r*.07,
        0,
        Math.PI*2
      );

      ctx.fillStyle = bull;
      ctx.fill();



      // Steel rings

      ctx.strokeStyle = "#d0d0d0";
      ctx.lineWidth = r*.0025;

      ctx.beginPath();
      ctx.arc(cx,cy,r*.16,0,Math.PI*2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx,cy,r*.07,0,Math.PI*2);
      ctx.stroke();



      // Final glass-like lighting

      const shine =
        ctx.createRadialGradient(
          cx-r*.3,
          cy-r*.35,
          0,
          cx,
          cy,
          r
        );


      shine.addColorStop(
        0,
        "rgba(255,255,255,.10)"
      );

      shine.addColorStop(
        .4,
        "rgba(255,255,255,.02)"
      );

      shine.addColorStop(
        1,
        "rgba(0,0,0,.25)"
      );


      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        r,
        0,
        Math.PI*2
      );


      ctx.fillStyle = shine;
      ctx.fill();


    };


    // =========================
    // REALISTIC DART
    // =========================

    const drawDart = (x, y, angle) => {

      ctx.save();

      ctx.translate(x,y);
      ctx.rotate(angle);


      // shadow

      ctx.shadowColor =
        "rgba(0,0,0,.8)";

      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;


      // steel point

      const point =
        ctx.createLinearGradient(
          12,-2,
          12,2
        );

      point.addColorStop(0,"white");
      point.addColorStop(.5,"#999");
      point.addColorStop(1,"#333");


      ctx.beginPath();

      ctx.moveTo(38,0);
      ctx.lineTo(10,-2);
      ctx.lineTo(10,2);

      ctx.closePath();

      ctx.fillStyle = point;
      ctx.fill();


      // barrel
      // (CONTINUES...) 
