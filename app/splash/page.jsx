      const barrel =
        ctx.createLinearGradient(
          -15,-7,
          -15,7
        );

      barrel.addColorStop(0,"#f8d060");
      barrel.addColorStop(.15,"#b98010");
      barrel.addColorStop(.3,"#fff2a0");
      barrel.addColorStop(.5,"#d9a220");
      barrel.addColorStop(.7,"#8a5a00");
      barrel.addColorStop(1,"#342000");

      ctx.beginPath();
      ctx.roundRect(
        -18,
        -7,
        30,
        14,
        4
      );

      ctx.fillStyle = barrel;
      ctx.fill();


      // tungsten knurling

      for(let i=-15;i<10;i+=2){

        ctx.fillStyle =
          "rgba(0,0,0,.25)";

        ctx.fillRect(
          i,
          -7,
          1,
          14
        );

      }


      // shaft

      const shaft =
        ctx.createLinearGradient(
          -45,-3,
          -45,3
        );


      shaft.addColorStop(0,"#fff");
      shaft.addColorStop(.4,"#999");
      shaft.addColorStop(1,"#333");


      ctx.fillStyle = shaft;

      ctx.fillRect(
        -42,
        -3,
        25,
        6
      );


      // flights

      ctx.fillStyle =
        "#c91520";


      ctx.beginPath();

      ctx.moveTo(-42,-2);

      ctx.bezierCurveTo(
        -48,-8,
        -58,-20,
        -65,-28
      );

      ctx.lineTo(-52,-12);
      ctx.lineTo(-42,-2);

      ctx.fill();



      ctx.beginPath();

      ctx.moveTo(-42,2);

      ctx.bezierCurveTo(
        -48,
        8,
        -58,
        20,
        -65,
        28
      );

      ctx.lineTo(-52,12);
      ctx.lineTo(-42,2);

      ctx.fill();



      // flight shine

      ctx.strokeStyle =
        "rgba(255,255,255,.4)";

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.moveTo(-45,-6);

      ctx.lineTo(
        -58,
        -20
      );

      ctx.stroke();


      ctx.beginPath();

      ctx.moveTo(-45,6);

      ctx.lineTo(
        -58,
        20
      );

      ctx.stroke();


      ctx.restore();

    };


    // ==============================
    // KEEP YOUR ORIGINAL LOGIC HERE
    // ==============================

    // IMPORTANT:
    // Copy everything from your ORIGINAL file starting at:
    //
    // let phase = "idle";
    //
    // down to the very last closing }
    //
    // The graphics replacement is now complete.
